import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface DashboardData {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    subscriptionType: string;
  };
  summary: {
    totalAquariums: number;
    activeAlerts: number;
    upcomingTasks: number;
    lastWaterChange?: Date;
  };
  aquariums: Array<{
    id: string;
    name: string;
    type: string;
    volume: number;
    imageUrl?: string;
    health: 'good' | 'warning' | 'critical';
    lastMeasurement?: {
      temperature?: number;
      ph?: number;
      timestamp: Date;
    };
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    title: string;
    aquariumId?: string;
    aquariumName?: string;
    timestamp: Date;
    isCompleted: boolean;
  }>;
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
    isRead: boolean;
  }>;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getDashboardData(userId: string, token: string): Promise<DashboardData> {
    const cacheKey = `dashboard:${userId}`;
    
    // Try cache first
    const cached = await this.cacheManager.get<DashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch data from multiple services in parallel
      const [userResponse, aquariumsResponse, eventsResponse] = await Promise.all([
        this.fetchUserData(userId, token),
        this.fetchAquariumsData(userId, token),
        this.fetchEventsData(userId, token),
      ]);

      // Process and aggregate data
      const dashboardData: DashboardData = {
        user: this.processUserData(userResponse),
        summary: await this.calculateSummary(userId, token, aquariumsResponse, eventsResponse),
        aquariums: this.processAquariumsData(aquariumsResponse),
        recentEvents: this.processEventsData(eventsResponse),
        notifications: await this.fetchNotifications(userId, token),
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, dashboardData, this.configService.get('cache.ttl'));

      return dashboardData;
    } catch (error) {
      this.logger.error('Failed to fetch dashboard data', error);
      throw error;
    }
  }

  private async fetchUserData(userId: string, token: string): Promise<any> {
    const url = `${this.configService.get('services.userService')}/users/${userId}`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return response.data;
  }

  private async fetchAquariumsData(userId: string, token: string): Promise<any> {
    const url = `${this.configService.get('services.aquariumService')}/aquariums`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { userId, limit: 10 },
      }),
    );
    return response.data;
  }

  private async fetchEventsData(userId: string, token: string): Promise<any> {
    const url = `${this.configService.get('services.eventService')}/events`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          userId,
          isCompleted: false,
          limit: 10,
          sort: 'scheduledAt',
        },
      }),
    );
    return response.data;
  }

  private async fetchNotifications(userId: string, token: string): Promise<any[]> {
    // In a real implementation, this would fetch from a notifications service
    // For now, return mock data
    return [
      {
        id: '1',
        type: 'info',
        message: 'Welcome to Verpa! Set up your first aquarium to get started.',
        timestamp: new Date(),
        isRead: false,
      },
    ];
  }

  private processUserData(userData: any): DashboardData['user'] {
    return {
      id: userData._id || userData.id,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatar: userData.avatar,
      subscriptionType: userData.subscriptionType || 'FREE',
    };
  }

  private async calculateSummary(
    userId: string,
    token: string,
    aquariumsData: any,
    eventsData: any,
  ): Promise<DashboardData['summary'] {
    const aquariums = aquariumsData.data || aquariumsData.aquariums || [];
    const events = eventsData.data || eventsData.events || [];

    // Count active alerts (events with high priority)
    const activeAlerts = events.filter((e: any) => 
      e.priority === 'high' && !e.isCompleted
    ).length;

    // Count upcoming tasks
    const upcomingTasks = events.filter((e: any) => !e.isCompleted).length;

    // Find last water change
    const lastWaterChange = events
      .filter((e: any) => e.type === 'water_change' && e.isCompleted)
      .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    return {
      totalAquariums: aquariums.length,
      activeAlerts,
      upcomingTasks,
      lastWaterChange: lastWaterChange?.completedAt,
    };
  }

  private processAquariumsData(aquariumsData: any): DashboardData['aquariums'] {
    const aquariums = aquariumsData.data || aquariumsData.aquariums || [];
    
    return aquariums.slice(0, 5).map((aquarium: any) => {
      // Determine health status based on parameters
      let health: 'good' | 'warning' | 'critical' = 'good';
      
      if (aquarium.waterParameters?.length > 0) {
        const latestParams = aquarium.waterParameters[0];
        
        // Simple health logic based on parameters
        if (
          latestParams.temperature < 20 || latestParams.temperature > 30 ||
          latestParams.ph < 6.5 || latestParams.ph > 8.5
        ) {
          health = 'critical';
        } else if (
          latestParams.temperature < 22 || latestParams.temperature > 28 ||
          latestParams.ph < 6.8 || latestParams.ph > 8.2
        ) {
          health = 'warning';
        }
      }

      return {
        id: aquarium._id || aquarium.id,
        name: aquarium.name,
        type: aquarium.type,
        volume: aquarium.volume,
        imageUrl: aquarium.imageUrl,
        health,
        lastMeasurement: aquarium.waterParameters?.[0] ? {
          temperature: aquarium.waterParameters[0].temperature,
          ph: aquarium.waterParameters[0].ph,
          timestamp: new Date(aquarium.waterParameters[0].measuredAt),
        } : undefined,
      };
    });
  }

  private processEventsData(eventsData: any): DashboardData['recentEvents'] {
    const events = eventsData.data || eventsData.events || [];
    
    return events.slice(0, 10).map((event: any) => ({
      id: event._id || event.id,
      type: event.type,
      title: event.title,
      aquariumId: event.aquariumId,
      aquariumName: event.aquariumName,
      timestamp: new Date(event.scheduledAt),
      isCompleted: event.isCompleted,
    }));
  }

  async refreshDashboard(userId: string): Promise<void> {
    const cacheKey = `dashboard:${userId}`;
    await this.cacheManager.del(cacheKey);
  }
}
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createSubscription(
    @CurrentUser() user: any,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.createSubscription(user.id, dto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription' })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  async getCurrentSubscription(@CurrentUser() user: any) {
    const subscription = await this.subscriptionService.getUserSubscription(user.id);
    if (!subscription) {
      return {
        message: 'No active subscription',
        planId: 'free',
        features: this.subscriptionService['configService'].get('subscription.plans.free.features'),
      };
    }
    return subscription;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscription(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 204, description: 'Subscription canceled successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(
    @Param('id') id: string,
    @Query('immediately') immediately: boolean = false,
  ) {
    await this.subscriptionService.cancelSubscription(id, immediately);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate canceled subscription' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot reactivate subscription' })
  async reactivateSubscription(@Param('id') id: string) {
    return this.subscriptionService.reactivateSubscription(id);
  }

  @Get('check-feature/:feature')
  @ApiOperation({ summary: 'Check if user has access to a feature' })
  @ApiResponse({ status: 200, description: 'Feature access status' })
  async checkFeatureAccess(
    @CurrentUser() user: any,
    @Param('feature') feature: string,
  ) {
    const hasAccess = await this.subscriptionService.checkFeatureAccess(user.id, feature as any);
    return { feature, hasAccess };
  }

  @Get('check-limit/:resource')
  @ApiOperation({ summary: 'Check resource usage limit' })
  @ApiResponse({ status: 200, description: 'Resource limit status' })
  async checkResourceLimit(
    @CurrentUser() user: any,
    @Param('resource') resource: 'aquariums' | 'photos',
  ) {
    return this.subscriptionService.checkResourceLimit(user.id, resource);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans' })
  async getPlans() {
    const plans = this.subscriptionService['configService'].get('subscription.plans');
    return Object.entries(plans).map(([id, plan]: [string, any]) => ({
      id,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: plan.features,
    }));
  }
}
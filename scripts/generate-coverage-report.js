#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Coverage report generator for Verpa project
class CoverageReporter {
  constructor() {
    this.coverageData = {
      backend: {},
      mobile: {},
      admin: {},
      overall: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    };
  }

  async generate() {
    console.log('🧪 Generating Verpa Coverage Report...\n');

    try {
      // Collect backend coverage
      await this.collectBackendCoverage();

      // Collect mobile coverage
      await this.collectMobileCoverage();

      // Collect admin coverage
      await this.collectAdminCoverage();

      // Calculate overall coverage
      this.calculateOverallCoverage();

      // Generate HTML report
      this.generateHTMLReport();

      // Generate markdown report
      this.generateMarkdownReport();

      console.log('\n✅ Coverage report generated successfully!');
      console.log('📊 HTML Report: coverage-report/index.html');
      console.log('📄 Markdown Report: coverage-report/coverage.md');
    } catch (error) {
      console.error('❌ Error generating coverage report:', error.message);
      process.exit(1);
    }
  }

  async collectBackendCoverage() {
    console.log('📦 Collecting backend coverage...');

    const services = [
      'user-service',
      'aquarium-service',
      'analytics-service',
      'event-service',
      'notification-service',
      'subscription-service',
      'media-service',
      'api-gateway',
      'mobile-bff',
    ];

    for (const service of services) {
      const servicePath = path.join(__dirname, '..', 'backend', 'services', service);
      const coveragePath = path.join(servicePath, 'coverage', 'coverage-summary.json');

      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.coverageData.backend[service] = coverage.total;
        console.log(`  ✓ ${service}: ${coverage.total.lines.pct}% lines`);
      } else {
        console.log(`  ⚠️  ${service}: No coverage data found`);
      }
    }
  }

  async collectMobileCoverage() {
    console.log('\n📱 Collecting mobile coverage...');

    const coveragePath = path.join(__dirname, '..', 'mobile', 'coverage', 'lcov.info');

    if (fs.existsSync(coveragePath)) {
      // Parse lcov.info file
      const lcovData = fs.readFileSync(coveragePath, 'utf8');
      const coverage = this.parseLcov(lcovData);
      this.coverageData.mobile = coverage;
      console.log(`  ✓ Mobile app: ${coverage.lines.pct}% lines`);
    } else {
      console.log('  ⚠️  Mobile app: No coverage data found');
    }
  }

  async collectAdminCoverage() {
    console.log('\n🖥️  Collecting admin panel coverage...');

    const coveragePath = path.join(__dirname, '..', 'admin', 'coverage', 'coverage-summary.json');

    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      this.coverageData.admin = coverage.total;
      console.log(`  ✓ Admin panel: ${coverage.total.lines.pct}% lines`);
    } else {
      console.log('  ⚠️  Admin panel: No coverage data found');
    }
  }

  parseLcov(lcovData) {
    const lines = lcovData.split('\n');
    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    lines.forEach(line => {
      if (line.startsWith('LF:')) {
        totalLines += parseInt(line.substring(3));
      } else if (line.startsWith('LH:')) {
        coveredLines += parseInt(line.substring(3));
      } else if (line.startsWith('FNF:')) {
        totalFunctions += parseInt(line.substring(4));
      } else if (line.startsWith('FNH:')) {
        coveredFunctions += parseInt(line.substring(4));
      } else if (line.startsWith('BRF:')) {
        totalBranches += parseInt(line.substring(4));
      } else if (line.startsWith('BRH:')) {
        coveredBranches += parseInt(line.substring(4));
      }
    });

    return {
      lines: {
        total: totalLines,
        covered: coveredLines,
        pct: totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0,
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        pct: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0,
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        pct: totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(2) : 0,
      },
      statements: {
        total: totalLines,
        covered: coveredLines,
        pct: totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0,
      },
    };
  }

  calculateOverallCoverage() {
    console.log('\n📊 Calculating overall coverage...');

    let totalStats = {
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      lines: { total: 0, covered: 0 },
    };

    // Aggregate backend coverage
    Object.values(this.coverageData.backend).forEach(coverage => {
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        if (coverage[metric]) {
          totalStats[metric].total += coverage[metric].total;
          totalStats[metric].covered += coverage[metric].covered;
        }
      });
    });

    // Add mobile coverage
    if (this.coverageData.mobile.lines) {
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        if (this.coverageData.mobile[metric]) {
          totalStats[metric].total += this.coverageData.mobile[metric].total;
          totalStats[metric].covered += this.coverageData.mobile[metric].covered;
        }
      });
    }

    // Add admin coverage
    if (this.coverageData.admin.lines) {
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        if (this.coverageData.admin[metric]) {
          totalStats[metric].total += this.coverageData.admin[metric].total;
          totalStats[metric].covered += this.coverageData.admin[metric].covered;
        }
      });
    }

    // Calculate percentages
    this.coverageData.overall = {
      statements: totalStats.statements.total > 0 
        ? (totalStats.statements.covered / totalStats.statements.total * 100).toFixed(2)
        : 0,
      branches: totalStats.branches.total > 0
        ? (totalStats.branches.covered / totalStats.branches.total * 100).toFixed(2)
        : 0,
      functions: totalStats.functions.total > 0
        ? (totalStats.functions.covered / totalStats.functions.total * 100).toFixed(2)
        : 0,
      lines: totalStats.lines.total > 0
        ? (totalStats.lines.covered / totalStats.lines.total * 100).toFixed(2)
        : 0,
    };

    console.log(`  Overall coverage: ${this.coverageData.overall.lines}% lines`);
  }

  generateHTMLReport() {
    const reportDir = path.join(__dirname, '..', 'coverage-report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verpa Test Coverage Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .overall-coverage {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            color: #3498db;
        }
        .metric-label {
            font-size: 14px;
            color: #7f8c8d;
            text-transform: uppercase;
        }
        .coverage-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        th {
            background: #34495e;
            color: white;
            font-weight: 500;
        }
        .coverage-bar {
            background: #ecf0f1;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }
        .coverage-fill {
            height: 100%;
            background: #27ae60;
            transition: width 0.3s ease;
        }
        .coverage-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            font-weight: bold;
        }
        .good { background: #27ae60; }
        .warning { background: #f39c12; }
        .danger { background: #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Verpa Test Coverage Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="overall-coverage">
        <div class="metric-card">
            <div class="metric-value">${this.coverageData.overall.statements}%</div>
            <div class="metric-label">Statements</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.coverageData.overall.branches}%</div>
            <div class="metric-label">Branches</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.coverageData.overall.functions}%</div>
            <div class="metric-label">Functions</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.coverageData.overall.lines}%</div>
            <div class="metric-label">Lines</div>
        </div>
    </div>

    <div class="coverage-table">
        <h2 style="padding: 20px;">Backend Services</h2>
        <table>
            <thead>
                <tr>
                    <th>Service</th>
                    <th>Statements</th>
                    <th>Branches</th>
                    <th>Functions</th>
                    <th>Lines</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(this.coverageData.backend).map(([service, coverage]) => `
                <tr>
                    <td>${service}</td>
                    <td>${this.renderCoverageBar(coverage.statements?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(coverage.branches?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(coverage.functions?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(coverage.lines?.pct || 0)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="coverage-table">
        <h2 style="padding: 20px;">Frontend Applications</h2>
        <table>
            <thead>
                <tr>
                    <th>Application</th>
                    <th>Statements</th>
                    <th>Branches</th>
                    <th>Functions</th>
                    <th>Lines</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Mobile App</td>
                    <td>${this.renderCoverageBar(this.coverageData.mobile.statements?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(this.coverageData.mobile.branches?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(this.coverageData.mobile.functions?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(this.coverageData.mobile.lines?.pct || 0)}</td>
                </tr>
                <tr>
                    <td>Admin Panel</td>
                    <td>${this.renderCoverageBar(this.coverageData.admin.statements?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(this.coverageData.admin.branches?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(this.coverageData.admin.functions?.pct || 0)}</td>
                    <td>${this.renderCoverageBar(this.coverageData.admin.lines?.pct || 0)}</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(path.join(reportDir, 'index.html'), html);
  }

  renderCoverageBar(percentage) {
    const pct = parseFloat(percentage) || 0;
    const cssClass = pct >= 90 ? 'good' : pct >= 80 ? 'warning' : 'danger';
    
    return `
      <div class="coverage-bar">
        <div class="coverage-fill ${cssClass}" style="width: ${pct}%"></div>
        <div class="coverage-text">${pct}%</div>
      </div>
    `;
  }

  generateMarkdownReport() {
    const reportDir = path.join(__dirname, '..', 'coverage-report');
    
    let markdown = `# Verpa Test Coverage Report

Generated: ${new Date().toLocaleString()}

## Overall Coverage

| Metric | Coverage |
|--------|----------|
| Statements | ${this.coverageData.overall.statements}% |
| Branches | ${this.coverageData.overall.branches}% |
| Functions | ${this.coverageData.overall.functions}% |
| Lines | ${this.coverageData.overall.lines}% |

## Backend Services

| Service | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
`;

    Object.entries(this.coverageData.backend).forEach(([service, coverage]) => {
      markdown += `| ${service} | ${coverage.statements?.pct || 0}% | ${coverage.branches?.pct || 0}% | ${coverage.functions?.pct || 0}% | ${coverage.lines?.pct || 0}% |\n`;
    });

    markdown += `
## Frontend Applications

| Application | Statements | Branches | Functions | Lines |
|-------------|------------|----------|-----------|-------|
| Mobile App | ${this.coverageData.mobile.statements?.pct || 0}% | ${this.coverageData.mobile.branches?.pct || 0}% | ${this.coverageData.mobile.functions?.pct || 0}% | ${this.coverageData.mobile.lines?.pct || 0}% |
| Admin Panel | ${this.coverageData.admin.statements?.pct || 0}% | ${this.coverageData.admin.branches?.pct || 0}% | ${this.coverageData.admin.functions?.pct || 0}% | ${this.coverageData.admin.lines?.pct || 0}% |
`;

    fs.writeFileSync(path.join(reportDir, 'coverage.md'), markdown);
  }
}

// Run the reporter
const reporter = new CoverageReporter();
reporter.generate();
# EC2 Server Overview and Access Guide

## How to Access Your EC2 Server

### SSH Access
```bash
# Set correct permissions for the key (first time only)
chmod 400 /Users/guntarsdikis/websites/EC2/GDWD2-new.pem

# Connect to the server
ssh -i /Users/guntarsdikis/websites/EC2/GDWD2-new.pem ec2-user@3.9.156.34

# Alternative using DNS name
ssh -i /Users/guntarsdikis/websites/EC2/GDWD2-new.pem ec2-user@ec2-3-9-156-34.eu-west-2.compute.amazonaws.com
```

### Web Access
- **Public IP**: http://3.9.156.34
- **Domains**:
  - https://eladoreruffles.gdwd.co.uk
  - https://lusiic.gdwd.co.uk
  - https://phpmyadmin.gdwd.co.uk
  - https://onizglitiba.gdwd.co.uk

## Server Details

### AWS Instance Information
- **Instance ID**: i-0a025c505616127d2
- **Instance Name**: WebServer
- **Instance Type**: t3.small
- **Region**: eu-west-2 (Europe - London)
- **Availability Zone**: eu-west-2 (based on subnet-1fe9be64)
- **VPC ID**: vpc-c71632ae
- **Public IP**: 3.9.156.34
- **Private IP**: 172.31.5.5
- **DNS Name**: ec2-3-9-156-34.eu-west-2.compute.amazonaws.com
- **Launch Date**: March 18, 2025
- **SSH Key Name**: GDWD2-new.pem
- **Platform**: Linux/UNIX (x86_64)

### Storage
- **Volume ID**: vol-0f230ff418469c75d
- **Size**: 8 GB (GP2)
- **Mount Point**: /dev/xvda
- **Current Usage**: 3.3GB used (42% full)
- **Snapshot**: snap-0bf991ed89c836d9e (Created Aug 17, 2025)

### Security Group Configuration
- **Group Name**: default
- **SSM Session Manager**: Enabled ✅ (No SSH port needed)
- **Open Ports**:
  - All traffic (0.0.0.0/0) - WARNING: Very permissive
  - Port 80 (HTTP) - Required for websites
  - Port 443 (HTTPS) - Required for SSL websites
  - Port 3306 (MySQL) - Can be removed (no local MySQL)
  - Port 10000 (Webmin) - Can be removed (access via SSM port forwarding)

## Server Software Stack

### Operating System
- **OS**: Amazon Linux
- **Architecture**: x86_64

### Web Server
- **Software**: Apache 2.4.62
- **Status**: Active and running
- **Uptime**: Running since April 30, 2025 (3+ months)
- **Configuration Location**: /etc/httpd/
- **Document Root**: /var/www/
- **Main PID**: 2062
- **Total Requests Served**: 177,686+

### PHP Configuration
- **Version**: PHP 7.4.33 (CLI)
- **Zend Engine**: v3.4.0
- **Extensions**: Zend OPcache v7.4.33
- **Handler**: PHP-FPM or mod_php (via Apache)

### Database (Aurora MySQL - AWS RDS)
- **Type**: Amazon Aurora MySQL 8.0
- **Cluster Identifier**: gdwd
- **Engine Version**: 8.0.mysql_aurora.3.05.2
- **Writer Endpoint**: gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com
- **Reader Endpoint**: gdwd.cluster-ro-cjjl7f5jormj.eu-west-2.rds.amazonaws.com
- **Instance**: gdwd-instance-1.cjjl7f5jormj.eu-west-2.rds.amazonaws.com
- **Port**: 3306
- **Master Username**: gdwd
- **Storage**: Encrypted
- **Backup Retention**: 1 day
- **Local MySQL**: Client tools installed, but NO local MySQL server running
- **Note**: Applications connect to Aurora, not local database

## Hosted Domains and SSL Certificates

### 1. Eladoreruffles ⚠️ (MAINTENANCE MODE)
- **Primary Domain**: eladoreruffles.gdwd.co.uk
- **Aliases**: eladoreruffles.com, www.eladoreruffles.com
- **Status**: Showing maintenance page (site disabled but preserved)
- **SSL Certificate**: Let's Encrypt
- **Expiry Date**: October 14, 2025
- **Original Location**: /var/www/eladoreruffles_codeigniter (583MB)
- **Framework**: CodeIgniter
- **Backup Config**: /etc/httpd/conf.d/eladoreruffles*.backup

### 2. Lusiic
- **Primary Domain**: lusiic.gdwd.co.uk
- **Alias**: lusiic.lv
- **SSL Certificates**: 
  - lusiic.gdwd.co.uk: Expires Oct 14, 2025 (58 days)
  - lusiic.lv: Expires Oct 20, 2025 (63 days)

### 3. Onizglitiba
- **Primary Domain**: onizglitiba.gdwd.co.uk
- **Alias**: konference.onizglitiba.lv
- **SSL Certificate**: Let's Encrypt
- **Expiry Date**: October 20, 2025 (64 days remaining)

### 4. phpMyAdmin
- **Domain**: phpmyadmin.gdwd.co.uk
- **SSL Certificate**: Let's Encrypt
- **Expiry Date**: October 20, 2025 (63 days remaining)
- **Document Root**: /var/www/phpmyadmin
- **Purpose**: Database management interface

## Apache Virtual Hosts Configuration

### Port 80 (HTTP)
- Default server: ip-172-31-5-5.eu-west-2.compute.internal
- eladoreruffles.gdwd.co.uk (with aliases)
- konference.onizglitiba.lv
- lusiic.gdwd.co.uk (with lusiic.lv alias)
- onizglitiba.gdwd.co.uk
- phpmyadmin.gdwd.co.uk

### Port 443 (HTTPS)
- All domains configured with SSL
- Configuration files in: /etc/httpd/conf.d/
  - eladoreruffles-le-ssl.conf
  - lugcrm-le-ssl.conf
  - onizglitiba-le-ssl.conf
  - phpmyadmin-le-ssl.conf
  - ssl.conf

## System Resources

### Memory
- **Total RAM**: 1.9 GB
- **Used**: 829 MB
- **Free**: 509 MB
- **Available**: 928 MB
- **Buffer/Cache**: 603 MB
- **Swap**: Not configured (0B)

### Disk Usage
- **Filesystem**: /dev/nvme0n1p1
- **Total Size**: 8.0 GB
- **Used**: 5.1 GB (63%)
- **Available**: 3.0 GB
- **Mount Point**: /

## SSL Certificate Management

### Current Certificates Status
All certificates are managed by Let's Encrypt (Certbot):

1. **eladoreruffles.gdwd.co.uk**
   - Serial: 50e255dcfc6e51a9b8d548eccd3433fbbf2
   - Valid until: Oct 14, 2025

2. **konference.onizglitiba.lv**
   - Serial: 62a26e93e617e4932daeecd986a3ec87801
   - Valid until: Oct 20, 2025

3. **lusiic.gdwd.co.uk** (includes onizglitiba.gdwd.co.uk)
   - Serial: 5f9038f72b701db9ece0d69a821cb73cfbd
   - Valid until: Oct 14, 2025

4. **lusiic.lv**
   - Serial: 591cc7e6d03fb59e267c05296b2e27439b4
   - Valid until: Oct 20, 2025

5. **phpmyadmin.gdwd.co.uk**
   - Serial: 500cf7bda49861950ce8b91356008cf6239
   - Valid until: Oct 20, 2025

### Certificate Paths
- **Certificate Location**: /etc/letsencrypt/live/[domain]/fullchain.pem
- **Private Key Location**: /etc/letsencrypt/live/[domain]/privkey.pem

### Renewal Command
```bash
sudo certbot renew --dry-run  # Test renewal
sudo certbot renew            # Actual renewal
```

## Additional Services

### Webmin Control Panel
- **Version**: 2.303
- **Port**: 10000 (listening)
- **Status**: Active and running ✅
- **Username**: root
- **Password**: YourNewPassword123 (changed Aug 17, 2025)

#### Access Methods

**Method 1: SSM Port Forwarding (Recommended)**
```bash
aws ssm start-session \
    --target i-0a025c505616127d2 \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["10000"],"localPortNumber":["10000"]}' \
    --region eu-west-2
# Then browse to: http://localhost:10000
```

**Method 2: SSH Tunnel**
```bash
ssh -i /Users/guntarsdikis/websites/EC2/GDWD2-new.pem \
    -L 10000:localhost:10000 \
    ec2-user@3.9.156.34
# Then browse to: http://localhost:10000
```

#### Common Webmin Tasks
- **System Info**: Dashboard with CPU, memory, disk usage
- **File Manager**: Tools → File Manager
- **Service Management**: Servers → Apache Webserver
- **User Management**: System → Users and Groups
- **Backup**: System → Filesystem Backup

#### Webmin Management
```bash
# Change Webmin password
sudo /usr/libexec/webmin/changepass.pl /etc/webmin root newpassword

# Restart Webmin
sudo systemctl restart webmin

# Check status
sudo systemctl status webmin

# View logs
sudo tail -f /var/webmin/miniserv.log
```

## SSM Session Manager Access

### Status
- **SSM Status**: Online ✅
- **IAM Role**: EC2-SSM-Role attached
- **Agent Version**: 3.3.2958.0

### Connect Without SSH Keys
```bash
# Basic connection (replaces SSH)
aws ssm start-session --target i-0a025c505616127d2 --region eu-west-2

# Via AWS Console
# Go to EC2 → Select instance → Connect → Session Manager
```

### Port Forwarding Examples
```bash
# Access Webmin
aws ssm start-session --target i-0a025c505616127d2 \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["10000"],"localPortNumber":["10000"]}' \
    --region eu-west-2

# Access Aurora Database
aws ssm start-session --target i-0a025c505616127d2 \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters '{"host":["gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com"],"portNumber":["3306"],"localPortNumber":["3306"]}' \
    --region eu-west-2
```

### Run Remote Commands
```bash
# Execute commands without connecting
aws ssm send-command \
    --instance-ids i-0a025c505616127d2 \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["df -h","free -m"]' \
    --region eu-west-2
```

## Common Management Commands

### Service Management
```bash
# Apache
sudo systemctl status httpd
sudo systemctl restart httpd
sudo systemctl reload httpd

# Check Apache configuration
sudo httpd -t
sudo httpd -S  # List virtual hosts

# MySQL/MariaDB
sudo systemctl status mariadb
sudo systemctl restart mariadb

# View logs
sudo tail -f /etc/httpd/logs/error_log
sudo tail -f /etc/httpd/logs/access_log
```

### File Locations
```bash
# Apache config
/etc/httpd/conf/httpd.conf
/etc/httpd/conf.d/

# Website files
/var/www/html/
/var/www/eladoreruffles_codeigniter/
/var/www/phpmyadmin/

# SSL certificates
/etc/letsencrypt/live/

# PHP config
/etc/php.ini
```

## Security Recommendations

### Critical
1. **Restrict Security Group**: Currently allows all traffic (0.0.0.0/0)
   - With SSM enabled, SSH port 22 can be closed entirely
   - Port 3306 can be removed (no local MySQL, Aurora accessed via SSM)
   - Port 10000 can be removed (Webmin accessible via SSM port forwarding)
   - Keep only ports 80 and 443 open for web traffic

### Important
2. **SSL Certificate Renewal**: Certificates expire in ~2 months
   - Set up auto-renewal with cron job
   - Monitor expiration dates

3. **System Updates**
   ```bash
   sudo yum update -y
   ```

### Monitoring
4. **Disk Space**: Currently at 63% usage
   - Monitor /var/www/ directory growth
   - Consider log rotation for Apache logs

5. **Memory Usage**: Using 829MB of 1.9GB
   - Consider adding swap space for stability

6. **Backup Strategy**
   - Regular snapshots of EBS volume
   - Database backups for MySQL/MariaDB
   - Document root backups

## AWS CLI Commands for Management

```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-0a025c505616127d2 --region eu-west-2

# Create snapshot
aws ec2 create-snapshot --volume-id vol-0f230ff418469c75d --description "Backup $(date +%Y-%m-%d)" --region eu-west-2

# Reboot instance
aws ec2 reboot-instances --instance-ids i-0a025c505616127d2 --region eu-west-2

# Stop instance (WARNING: Public IP may change)
aws ec2 stop-instances --instance-ids i-0a025c505616127d2 --region eu-west-2

# Start instance
aws ec2 start-instances --instance-ids i-0a025c505616127d2 --region eu-west-2
```

## System Maintenance

### Automatic Cleanup Configured
- **Weekly Script**: `/etc/cron.weekly/cleanup-logs`
  - Removes journal logs older than 7 days
  - Deletes Apache logs older than 14 days
  - Cleans compressed cron logs older than 7 days
  - Clears yum cache
- **Journal Limits**: Max 100MB, 1 week retention

### Recent Changes (August 17, 2025)
1. **Disk Cleanup**: Reduced usage from 63% to 42%
2. **SSM Session Manager**: Configured and active
3. **Eladoreruffles Website**: Set to maintenance mode
4. **Automatic Log Rotation**: Configured
5. **EBS Snapshot**: Created backup (snap-0bf991ed89c836d9e)

## Notes
- SSM Session Manager is now configured and active ✅
- Webmin is installed and accessible via SSM port forwarding
- Migration backups have been removed to free space
- Consider implementing CloudWatch monitoring for production use

---
*Generated on: August 17, 2025*
*AWS Account: 573524060586*
*User: gdwd*
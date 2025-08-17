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
- **Current Usage**: 5.1GB used (63% full)

### Security Group Configuration
- **Group Name**: default
- **Open Ports**:
  - All traffic (0.0.0.0/0) - WARNING: Very permissive
  - Port 443 (HTTPS)
  - Port 3306 (MySQL/MariaDB)
  - Port 10000 (Webmin/Custom service)

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

### 1. Eladoreruffles
- **Primary Domain**: eladoreruffles.gdwd.co.uk
- **Aliases**: eladoreruffles.com, www.eladoreruffles.com
- **SSL Certificate**: Let's Encrypt
- **Expiry Date**: October 14, 2025 (58 days remaining)
- **Document Root**: /var/www/eladoreruffles_codeigniter
- **Framework**: CodeIgniter

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
   - Limit SSH (port 22) to your IP only
   - Port 3306 in security group can be removed (no local MySQL)
   - Keep only necessary ports open (80, 443)
   - Port 10000 - verify if needed (possibly Webmin)

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

## Notes
- SSM Session Manager is not configured (TargetNotConnected)
- No CloudWatch monitoring appears to be configured
- Consider implementing monitoring and alerting for production use

---
*Generated on: August 17, 2025*
*AWS Account: 573524060586*
*User: gdwd*
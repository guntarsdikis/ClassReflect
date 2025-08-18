# AWS Cognito User Pool for ClassReflect Authentication
resource "aws_cognito_user_pool" "classreflect_users" {
  name = "${var.project_name}-users"

  # Password policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
    temporary_password_validity_days = 7
  }

  # Username configuration (use email as username)
  alias_attributes = ["email"]
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Custom attributes for ClassReflect
  schema {
    name                = "school_id"
    attribute_data_type = "String"
    required            = true
    mutable            = false
    
    string_attribute_constraints {
      min_length = 36  # UUID length
      max_length = 36
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    required            = true
    mutable            = true
    
    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  schema {
    name                = "subjects"
    attribute_data_type = "String"
    required            = false
    mutable            = true
    
    string_attribute_constraints {
      min_length = 0
      max_length = 500  # JSON array of subjects
    }
  }

  schema {
    name                = "grades"
    attribute_data_type = "String"
    required            = false
    mutable            = true
    
    string_attribute_constraints {
      min_length = 0
      max_length = 100  # JSON array of grades
    }
  }

  # MFA configuration (optional)
  mfa_configuration = "OPTIONAL"
  
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email verification message customization
  verification_message_template {
    default_email_option = "CONFIRM_WITH_LINK"
    email_subject_by_link = "Welcome to ClassReflect - Verify your email"
    email_message_by_link = "Welcome to ClassReflect! Please click the link below to verify your email address: {##Verify Email##}"
  }

  # Admin create user message customization  
  admin_create_user_config {
    allow_admin_create_user_only = true  # No self-registration
    invite_message_template {
      email_subject = "Your ClassReflect Account"
      email_message = "Welcome to ClassReflect! Your username is {username} and temporary password is {####}. Please login and change your password. Login at: https://classreflect.${var.domain_name}"
      sms_message   = "Your ClassReflect username is {username} and temporary password is {####}."
    }
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Deletion protection
  deletion_protection = "ACTIVE"

  tags = {
    Name        = "${var.project_name}-user-pool"
    Environment = "production"
    Project     = var.project_name
  }
}

# User Pool Client for the ClassReflect application
resource "aws_cognito_user_pool_client" "classreflect_client" {
  name         = "${var.project_name}-app-client"
  user_pool_id = aws_cognito_user_pool.classreflect_users.id

  # Client settings
  generate_secret     = true  # For server-side authentication
  explicit_auth_flows = [
    "ADMIN_NO_SRP_AUTH",
    "USER_PASSWORD_AUTH"
  ]

  # Token validity periods
  access_token_validity  = 1   # 1 hour
  id_token_validity     = 1   # 1 hour  
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # OAuth settings
  supported_identity_providers = ["COGNITO"]
  
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["email", "openid", "profile"]
  
  callback_urls = [
    "https://classreflect.${var.domain_name}/auth/callback",
    "https://api.classreflect.${var.domain_name}/auth/callback",
    "http://localhost:3000/auth/callback"  # For development
  ]
  
  logout_urls = [
    "https://classreflect.${var.domain_name}/auth/logout",
    "http://localhost:3000/auth/logout"  # For development
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read/write attributes
  read_attributes = [
    "email",
    "email_verified", 
    "given_name",
    "family_name",
    "custom:school_id",
    "custom:role",
    "custom:subjects", 
    "custom:grades"
  ]
  
  write_attributes = [
    "email",
    "given_name",
    "family_name", 
    "custom:subjects",
    "custom:grades"
  ]
}

# User Pool Domain for hosted UI (optional)
resource "aws_cognito_user_pool_domain" "classreflect_domain" {
  domain       = "${var.project_name}-auth"
  user_pool_id = aws_cognito_user_pool.classreflect_users.id
}

# Identity Pool for AWS resource access (if needed)
resource "aws_cognito_identity_pool" "classreflect_identity" {
  identity_pool_name               = "${var.project_name}_identity"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id     = aws_cognito_user_pool_client.classreflect_client.id
    provider_name = aws_cognito_user_pool.classreflect_users.endpoint
  }

  tags = {
    Name        = "${var.project_name}-identity-pool"
    Environment = "production"
    Project     = var.project_name
  }
}

# IAM roles for authenticated users
resource "aws_iam_role" "cognito_authenticated" {
  name = "${var.project_name}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.classreflect_identity.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-cognito-authenticated-role"
    Environment = "production"
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy" "cognito_authenticated_policy" {
  name = "${var.project_name}-cognito-authenticated-policy"
  role = aws_iam_role.cognito_authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach role to identity pool
resource "aws_cognito_identity_pool_roles_attachment" "classreflect_identity_roles" {
  identity_pool_id = aws_cognito_identity_pool.classreflect_identity.id

  roles = {
    authenticated = aws_iam_role.cognito_authenticated.arn
  }
}

# Outputs for use in application
output "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.classreflect_users.id
}

output "cognito_user_pool_client_id" {
  description = "The ID of the Cognito User Pool Client"  
  value       = aws_cognito_user_pool_client.classreflect_client.id
}

output "cognito_user_pool_client_secret" {
  description = "The secret of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.classreflect_client.client_secret
  sensitive   = true
}

output "cognito_user_pool_endpoint" {
  description = "The endpoint name of the Cognito User Pool"
  value       = aws_cognito_user_pool.classreflect_users.endpoint
}

output "cognito_user_pool_domain" {
  description = "The domain of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.classreflect_domain.domain
}

output "cognito_identity_pool_id" {
  description = "The ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.classreflect_identity.id
}
resource "aws_amplify_app" "classreflect" {
  name       = "${var.project_name}-frontend"
  repository = "https://github.com/YOUR_GITHUB_USERNAME/ClassReflect"
  
  build_spec = file("${path.module}/../../frontend/amplify.yml")
  
  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/index.html"
  }
  
  environment_variables = {
    REACT_APP_API_URL = "https://api.${var.project_name}.${var.domain_name}"
    REACT_APP_ENV     = "production"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.classreflect.id
  branch_name = "main"
  
  framework = "React"
  stage     = "PRODUCTION"
  
  enable_auto_build = true
}

resource "aws_amplify_domain_association" "classreflect" {
  app_id      = aws_amplify_app.classreflect.id
  domain_name = "${var.project_name}.${var.domain_name}"
  
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }
  
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "www"
  }
}

output "amplify_app_url" {
  value = "https://${aws_amplify_domain_association.classreflect.domain_name}"
}
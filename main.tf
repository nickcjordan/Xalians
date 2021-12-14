terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.48.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2.0"
    }
  }

  required_version = "~> 1.0"
}

provider "aws" {
  region = var.aws_region
}

resource "random_pet" "lambda_bucket_name" {
  prefix = "chronic-labs"
  length = 4
}

resource "aws_s3_bucket" "lambda_bucket" {
  bucket = random_pet.lambda_bucket_name.id
  acl           = "private"
  force_destroy = true
}



# copy to s3 bucket

data "archive_file" "lambda_generate_xalian" {
  type = "zip"

  source_dir  = "${path.module}/src"
  output_path = "${path.module}/generate_xalian_lambda.zip"
}

resource "aws_s3_bucket_object" "lambda_generate_xalian_object" {
  bucket = aws_s3_bucket.lambda_bucket.id

  key    = "generate_xalian_lambda.zip"
  source = data.archive_file.lambda_generate_xalian.output_path

  etag = filemd5(data.archive_file.lambda_generate_xalian.output_path)
}




# lambda function and resources

resource "aws_lambda_function" "lambda_function_generate_xalian" {
  function_name = "GenerateXalian"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_bucket_object.lambda_generate_xalian_object.key

  runtime = "nodejs12.x"
  handler = "generateXalianLambda.handler"

  source_code_hash = data.archive_file.lambda_generate_xalian.output_base64sha256

  role = aws_iam_role.lambda_exec.arn
}

resource "aws_cloudwatch_log_group" "lambda_function_generate_xalian" {
  name = "/aws/lambda/${aws_lambda_function.lambda_function_generate_xalian.function_name}"

  retention_in_days = 30
}

resource "aws_iam_role" "lambda_exec" {
  name = "serverless_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}



# API gateway

resource "aws_apigatewayv2_api" "lambda" {
  name          = "xalian_api_gateway"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "dev"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      }
    )
  }
}

resource "aws_apigatewayv2_integration" "lambda_function_generate_xalian" {
  api_id = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.lambda_function_generate_xalian.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "lambda_function_generate_xalian" {
  api_id = aws_apigatewayv2_api.lambda.id

  route_key = "GET /xalian"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_function_generate_xalian.id}"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

  retention_in_days = 30
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_function_generate_xalian.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}

resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.xalians.com"

  domain_name_configuration {
    certificate_arn = var.cert_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}


// ROUTE 53

data "aws_route53_zone" "xalian_zone" {
    name = "xalians.com"
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.xalian_zone.zone_id
  name    = aws_apigatewayv2_domain_name.api.domain_name
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = true
  }
}

resource "aws_apigatewayv2_api_mapping" "api_mapping" {
  api_id      = aws_apigatewayv2_api.lambda.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.lambda.id
}




###################
# react front end #
###################

resource "aws_s3_bucket" "react_bucket" {
  bucket = "${var.frontend_bucket_name}"
  acl    = "public-read"

  policy = <<EOF
{
  "Id": "bucket_policy_site",
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "bucket_policy_site_main",
      "Action": [
        "s3:GetObject"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${var.frontend_bucket_name}/*",
      "Principal": "*"
    }
  ]
}
EOF

  website {
    index_document = "index.html"
    error_document = "index.html"
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

// api gateway domain name

// resource "aws_apigatewayv2_domain_name" "ui" {
//   domain_name = "xalians.com"

//   domain_name_configuration {
//     certificate_arn = var.cert_arn
//     endpoint_type   = "REGIONAL"
//     security_policy = "TLS_1_2"
//   }
// }

// route53 for frontend

resource "aws_route53_record" "xalians-frontend" {
  zone_id = data.aws_route53_zone.xalian_zone.zone_id
  name    = "xalians.com"
  type    = "A"

  alias {
    name = aws_s3_bucket.react_bucket.website_domain
    zone_id = aws_s3_bucket.react_bucket.hosted_zone_id
    evaluate_target_health = true
  }
}


// api gateway mapping

// resource "aws_apigatewayv2_api_mapping" "ui_mapping" {
//   api_id      = aws_apigatewayv2_api.lambda.id
//   domain_name = aws_apigatewayv2_domain_name.ui.id
//   stage       = aws_apigatewayv2_stage.lambda.id
// }

// // api gateway integration

// resource "aws_apigatewayv2_integration" "ui_integration" {
//   api_id = aws_apigatewayv2_api.lambda.id

//   integration_uri    = aws_lambda_function.lambda_function_generate_xalian.invoke_arn
//   integration_type   = "AWS_PROXY"
//   integration_method = "POST"
// }

// resource "aws_apigatewayv2_route" "base_route" {
//   api_id = aws_apigatewayv2_api.lambda.id

//   route_key = "GET /"
//   target    = "integrations/${aws_apigatewayv2_integration.ui_integration.id}"
// }

// resource "aws_s3_access_point" "xalian_access" {
//   bucket = aws_s3_bucket.react_bucket.id
//   name   = "xalian"
// }
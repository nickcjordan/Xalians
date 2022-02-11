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


#########################################################
#####                     IAM                       #####
#########################################################
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

resource "aws_iam_role_policy_attachment" "dynamodb_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}
#####                                               #####
#########################################################

#########################################################
#####                COMMON LAMBDA                  #####
#########################################################
resource "random_pet" "lambda_bucket_name" {
  prefix = "chronic-labs"
  length = 4
}

resource "aws_s3_bucket" "lambda_bucket" {
  bucket        = random_pet.lambda_bucket_name.id
  acl           = "private"
  force_destroy = true
}

# lambda zip
data "archive_file" "lambda_zip_file" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/generate_xalian_lambda.zip"
}

# lambda bucket object
resource "aws_s3_bucket_object" "lambda_bucket_object" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "generate_xalian_lambda.zip"
  source = data.archive_file.lambda_zip_file.output_path
  etag   = filemd5(data.archive_file.lambda_zip_file.output_path)
}
#####                                               #####
#########################################################


#########################################################
#####               API Gateway Common              #####
#########################################################
resource "aws_apigatewayv2_api" "lambda" {
  name          = "XalianAPIGateway"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["http://*", "https://*"]
    allow_methods = ["GET", "OPTIONS", "PUT", "PATCH", "POST", "DELETE", "HEAD"]
    allow_headers = ["host", "authorization", "x-amz-date", "X-Amz-Security-Token", "Content-Type"]
    allow_credentials = true
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "prod"
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

resource "aws_apigatewayv2_stage" "test" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "test"
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

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"
  retention_in_days = 7
}
#####                                               #####
#########################################################


#########################################################
#####               LAMBDA INSTANCE                 #####
##              Generate Xalian Lambda                 ##
#########################################################
module "generate_xalian_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "GenerateXalian"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_handler_path             = "src/generateXalianLambda.handler"
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  apigw_lambda_route_key          = "GET /xalian"
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "NONE"
}
#####                                               #####
#########################################################


#########################################################
#####               LAMBDA INSTANCE                 #####
##            Table Create Xalian Lambda               ##
#########################################################
module "table_create_xalian_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "TableCreateXalian"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_handler_path             = "src/database/xalianTableCRUDLambdas.createXalian"
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  apigw_lambda_route_key          = "POST /db/xalian"
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "AWS_IAM"
}
#####                                               #####
#########################################################


#########################################################
#####               LAMBDA INSTANCE                 #####
##           Table Retrieve Xalian Lambda              ##
#########################################################
module "table_retrieve_xalian_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "TableRetrieveXalian"
  lambda_handler_path             = "src/database/xalianTableCRUDLambdas.retrieveXalian"
  apigw_lambda_route_key          = "GET /db/xalian"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "AWS_IAM"
}
#####                                               #####
#########################################################

#########################################################
#####               LAMBDA INSTANCE                 #####
##         Table Retrieve Xalian Batch Lambda          ##
#########################################################
module "table_retrieve_xalian_batch_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "TableRetrieveXalianBatch"
  lambda_handler_path             = "src/database/xalianTableCRUDLambdas.retrieveXalianBatch"
  apigw_lambda_route_key          = "GET /db/xalians"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "AWS_IAM"
}
#####                                               #####
#########################################################


#########################################################
#####               LAMBDA INSTANCE                 #####
##             Table Retrieve User Lambda              ##
#########################################################
module "table_retrieve_xalian_user_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "TableRetrieveXalianUser"
  lambda_handler_path             = "src/database/userTableCRUDLambdas.retrieveXalianUser"
  apigw_lambda_route_key          = "GET /db/user"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "AWS_IAM"
}
#####                                               #####
#########################################################

#########################################################
#####               LAMBDA INSTANCE                 #####
##              Table Create User Lambda               ##
#########################################################
module "table_create_xalian_user_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "TableCreateXalianUser"
  lambda_handler_path             = "src/database/userTableCRUDLambdas.createXalianUser"
  apigw_lambda_route_key          = "POST /db/user"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "AWS_IAM"
}
#####                                               #####
#########################################################

#########################################################
#####               LAMBDA INSTANCE                 #####
##              Table Update User Lambda               ##
#########################################################
module "table_update_xalian_user_lambda_module" {
  source = "./terraform/modules/lambda"

  function_name                   = "TableUpdateXalianUser"
  lambda_handler_path             = "src/database/userTableCRUDLambdas.updateXalianUser"
  apigw_lambda_route_key          = "PATCH /db/user"
  lambda_bucket_id                = aws_s3_bucket.lambda_bucket.id
  lambda_bucket_object_key        = aws_s3_bucket_object.lambda_bucket_object.key
  lambda_archive_file_output_hash = data.archive_file.lambda_zip_file.output_base64sha256
  iam_role_arn                    = aws_iam_role.lambda_exec.arn
  apigw_lambda_id                 = aws_apigatewayv2_api.lambda.id
  base_apigw_lambda_execution_arn = aws_apigatewayv2_api.lambda.execution_arn
  authorization_type              = "AWS_IAM"
}
#####                                               #####
#########################################################



// reference the cert that is created already
# Find a certificate issued by (not imported into) ACM
// data "aws_acm_certificate" "amazon_issued" {
//   domain      = "*.xalians.com"
//   types       = ["AMAZON_ISSUED"]
//   most_recent = true
// }

resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.xalians.com"

  domain_name_configuration {
    certificate_arn = var.cert_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_domain_name" "testapi" {
  domain_name = "testapi.xalians.com"

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
  stage       = aws_apigatewayv2_stage.prod.id
}

resource "aws_apigatewayv2_api_mapping" "testapi_mapping" {
  api_id      = aws_apigatewayv2_api.lambda.id
  domain_name = aws_apigatewayv2_domain_name.testapi.id
  stage       = aws_apigatewayv2_stage.test.id
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
      "Sid": "PublicRead",
      "Action": [
        "s3:GetObject"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::${var.frontend_bucket_name}",
        "arn:aws:s3:::${var.frontend_bucket_name}/*"
      ],
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


// STILL NEED THIS IT IS JUST ALREADY CREATED
// data "aws_cloudfront_distribution" "distribution" {
//   id = var.cloudfront_id
// }

// resource "aws_route53_record" "www-xalians-frontend" {
//   zone_id = data.aws_route53_zone.xalian_zone.zone_id
//   name    = "www.xalians.com"
//   type    = "A"

//   alias {
//     name = data.aws_cloudfront_distribution.distribution.domain_name
//     // name = aws_s3_bucket.react_bucket.website_domain
//     // zone_id = aws_s3_bucket.react_bucket.hosted_zone_id
//     zone_id = data.aws_cloudfront_distribution.distribution.hosted_zone_id
//     evaluate_target_health = true
//   }
// }



















// terraform {
//   required_providers {
//     aws = {
//       source  = "hashicorp/aws"
//       version = "~> 3.48.0"
//     }
//     random = {
//       source  = "hashicorp/random"
//       version = "~> 3.1.0"
//     }
//     archive = {
//       source  = "hashicorp/archive"
//       version = "~> 2.2.0"
//     }
//   }

//   required_version = "~> 1.0"
// }

// provider "aws" {
//   region = var.aws_region
// }

// resource "random_pet" "lambda_bucket_name" {
//   prefix = "chronic-labs"
//   length = 4
// }

// resource "aws_s3_bucket" "lambda_bucket" {
//   bucket = random_pet.lambda_bucket_name.id
//   acl           = "private"
//   force_destroy = true
// }

// # copy to s3 bucket

// data "archive_file" "lambda_zip" {
//   type = "zip"

//   // source_dir  = "../${path.root}/src"
//   // output_path = "../${path.root}/lambda_zip.zip"
//   source_dir  = "${path.root}/src"
//   output_path = "${path.root}/lambda_zip.zip"
// }

// resource "aws_s3_bucket_object" "lambda_zip_s3_object" {
//   bucket = aws_s3_bucket.lambda_bucket.id

//   key    = "lambda_zip.zip"
//   source = data.archive_file.lambda_zip.output_path

//   etag = filemd5(data.archive_file.lambda_zip.output_path)
// }

// resource "aws_iam_role" "lambda_exec" {
//   name = "serverless_lambda"

//   assume_role_policy = jsonencode({
//     Version = "2012-10-17"
//     Statement = [{
//       Action = "sts:AssumeRole"
//       Effect = "Allow"
//       Sid    = ""
//       Principal = {
//         Service = "lambda.amazonaws.com"
//       }
//       }
//     ]
//   })
// }

// resource "aws_iam_role_policy_attachment" "lambda_policy" {
//   role       = aws_iam_role.lambda_exec.name
//   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
// }



// # API gateway

// resource "aws_apigatewayv2_api" "lambda" {
//   name          = "xalian_api_gateway"
//   protocol_type = "HTTP"
// }

// resource "aws_apigatewayv2_stage" "prod" {
//   api_id = aws_apigatewayv2_api.lambda.id

//   name        = "prod"
//   auto_deploy = true

//   access_log_settings {
//     destination_arn = aws_cloudwatch_log_group.api_gw.arn

//     format = jsonencode({
//       requestId               = "$context.requestId"
//       sourceIp                = "$context.identity.sourceIp"
//       requestTime             = "$context.requestTime"
//       protocol                = "$context.protocol"
//       httpMethod              = "$context.httpMethod"
//       resourcePath            = "$context.resourcePath"
//       routeKey                = "$context.routeKey"
//       status                  = "$context.status"
//       responseLength          = "$context.responseLength"
//       integrationErrorMessage = "$context.integrationErrorMessage"
//       }
//     )
//   }
// }

// resource "aws_apigatewayv2_stage" "test" {
//   api_id = aws_apigatewayv2_api.lambda.id

//   name        = "test"
//   auto_deploy = true

//   access_log_settings {
//     destination_arn = aws_cloudwatch_log_group.api_gw.arn

//     format = jsonencode({
//       requestId               = "$context.requestId"
//       sourceIp                = "$context.identity.sourceIp"
//       requestTime             = "$context.requestTime"
//       protocol                = "$context.protocol"
//       httpMethod              = "$context.httpMethod"
//       resourcePath            = "$context.resourcePath"
//       routeKey                = "$context.routeKey"
//       status                  = "$context.status"
//       responseLength          = "$context.responseLength"
//       integrationErrorMessage = "$context.integrationErrorMessage"
//       }
//     )
//   }
// }

// resource "aws_cloudwatch_log_group" "api_gw" {
//   name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

//   retention_in_days = 30
// }



// // reference the cert that is created already
// # Find a certificate issued by (not imported into) ACM
// // data "aws_acm_certificate" "amazon_issued" {
// //   domain      = "*.xalians.com"
// //   types       = ["AMAZON_ISSUED"]
// //   most_recent = true
// // }

// resource "aws_apigatewayv2_domain_name" "api" {
//   domain_name = "api.xalians.com"

//   domain_name_configuration {
//     certificate_arn = var.cert_arn
//     endpoint_type   = "REGIONAL"
//     security_policy = "TLS_1_2"
//   }
// }

// resource "aws_apigatewayv2_domain_name" "testapi" {
//   domain_name = "testapi.xalians.com"

//   domain_name_configuration {
//     certificate_arn = var.cert_arn
//     endpoint_type   = "REGIONAL"
//     security_policy = "TLS_1_2"
//   }
// }



// // ROUTE 53

// data "aws_route53_zone" "xalian_zone" {
//     name = "xalians.com"
// }

// resource "aws_route53_record" "api" {
//   zone_id = data.aws_route53_zone.xalian_zone.zone_id
//   name    = aws_apigatewayv2_domain_name.api.domain_name
//   type    = "A"

//   alias {
//     name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
//     zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
//     evaluate_target_health = true
//   }
// }

// resource "aws_apigatewayv2_api_mapping" "api_mapping" {
//   api_id      = aws_apigatewayv2_api.lambda.id
//   domain_name = aws_apigatewayv2_domain_name.api.id
//   stage       = aws_apigatewayv2_stage.prod.id
// }

// resource "aws_apigatewayv2_api_mapping" "testapi_mapping" {
//   api_id      = aws_apigatewayv2_api.lambda.id
//   domain_name = aws_apigatewayv2_domain_name.testapi.id
//   stage       = aws_apigatewayv2_stage.test.id
// }




// ###################
// # react front end #
// ###################

// resource "aws_s3_bucket" "react_bucket" {
//   bucket = "${var.frontend_bucket_name}"
//   acl    = "public-read"

//   policy = <<EOF
// {
//   "Id": "bucket_policy_site",
//   "Version": "2012-10-17",
//   "Statement": [
//     {
//       "Sid": "PublicRead",
//       "Action": [
//         "s3:GetObject"
//       ],
//       "Effect": "Allow",
//       "Resource": [
//         "arn:aws:s3:::${var.frontend_bucket_name}",
//         "arn:aws:s3:::${var.frontend_bucket_name}/*"
//       ],
//       "Principal": "*"
//     }
//   ]
// }
// EOF

//   website {
//     index_document = "index.html"
//     error_document = "index.html"
//   }

//   cors_rule {
//     allowed_headers = ["*"]
//     allowed_methods = ["GET"]
//     allowed_origins = ["*"]
//     max_age_seconds = 3000
//   }
// }

// // api gateway domain name

// // resource "aws_apigatewayv2_domain_name" "ui" {
// //   domain_name = "xalians.com"

// //   domain_name_configuration {
// //     certificate_arn = var.cert_arn
// //     endpoint_type   = "REGIONAL"
// //     security_policy = "TLS_1_2"
// //   }
// // }

// // route53 for frontend

// data "aws_cloudfront_distribution" "distribution" {
//   id = var.cloudfront_id
// }

// resource "aws_route53_record" "www-xalians-frontend" {
//   zone_id = data.aws_route53_zone.xalian_zone.zone_id
//   name    = "www.xalians.com"
//   type    = "A"

//   alias {
//     name = data.aws_cloudfront_distribution.distribution.domain_name
//     // name = aws_s3_bucket.react_bucket.website_domain
//     // zone_id = aws_s3_bucket.react_bucket.hosted_zone_id
//     zone_id = data.aws_cloudfront_distribution.distribution.hosted_zone_id
//     evaluate_target_health = true
//   }
// }




// ###################
// #     database    #
// ###################

// // resource "aws_dynamodb_table" "xalian_table" {
// //   name             = "XalianTable"
// //   hash_key         = "speciesId"
// //   range_key        = "xalianId"
// //   billing_mode     = "PAY_PER_REQUEST"

// //   attribute {
// //     name = "speciesId"
// //     type = "S"
// //   }

// //   attribute {
// //     name = "xalianId"
// //     type = "S"
// //   }

// //   // replica {
// //   //   region_name = "us-east-2"
// //   // }

// //   // replica {
// //   //   region_name = "us-west-2"
// //   // }
// // }

# State reconstruction: the original terraform state was local-only and lost.
# These import blocks adopt every live resource into the new S3-backed state.
# They are no-ops once the resources are in state and can be deleted after the
# first successful apply.
#
# Live IDs captured 2026-08-29 from account 174497891311 (us-east-1).

# ----- IAM -----
import {
  to = aws_iam_role.lambda_exec
  id = "serverless_lambda"
}

import {
  to = aws_iam_role_policy_attachment.lambda_policy
  id = "serverless_lambda/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

import {
  to = aws_iam_role_policy_attachment.dynamodb_policy
  id = "serverless_lambda/arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# ----- Lambda artifact bucket -----
import {
  to = aws_s3_bucket.lambda_bucket
  id = "chronic-labs-officially-correctly-relaxed-prawn"
}

import {
  to = aws_s3_object.lambda_bucket_object
  id = "chronic-labs-officially-correctly-relaxed-prawn/generate_xalian_lambda.zip"
}

# ----- API Gateway -----
import {
  to = aws_apigatewayv2_api.lambda
  id = "6y8832nrlf"
}

import {
  to = aws_apigatewayv2_stage.prod
  id = "6y8832nrlf/prod"
}

import {
  to = aws_apigatewayv2_stage.test
  id = "6y8832nrlf/test"
}

import {
  to = aws_cloudwatch_log_group.api_gw
  id = "/aws/api_gw/XalianAPIGateway"
}

import {
  to = aws_apigatewayv2_domain_name.api
  id = "api.xalians.com"
}

import {
  to = aws_apigatewayv2_domain_name.testapi
  id = "testapi.xalians.com"
}

import {
  to = aws_apigatewayv2_api_mapping.api_mapping
  id = "14iemn/api.xalians.com"
}

import {
  to = aws_apigatewayv2_api_mapping.testapi_mapping
  id = "lo6jc4/testapi.xalians.com"
}

import {
  to = aws_route53_record.api
  id = "Z0533382310UWJ6FIDZF9_api.xalians.com_A"
}

# ----- Frontend bucket -----
import {
  to = aws_s3_bucket.react_bucket
  id = "xalians.com"
}

# (policy/website/cors import blocks live next to their resources in main.tf)

# ----- Lambda modules -----
# GenerateXalian :: GET /xalian
import {
  to = module.generate_xalian_lambda_module.aws_lambda_function.lambda_function
  id = "GenerateXalian"
}
import {
  to = module.generate_xalian_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/GenerateXalian"
}
import {
  to = module.generate_xalian_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/mookn0q"
}
import {
  to = module.generate_xalian_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/re7j5xd"
}
import {
  to = module.generate_xalian_lambda_module.aws_lambda_permission.apigw_permission
  id = "GenerateXalian/AllowExecutionFromAPIGateway"
}

# TableCreateXalian :: POST /db/xalian
import {
  to = module.table_create_xalian_lambda_module.aws_lambda_function.lambda_function
  id = "TableCreateXalian"
}
import {
  to = module.table_create_xalian_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/TableCreateXalian"
}
import {
  to = module.table_create_xalian_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/vxmcuwb"
}
import {
  to = module.table_create_xalian_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/7b67s4c"
}
import {
  to = module.table_create_xalian_lambda_module.aws_lambda_permission.apigw_permission
  id = "TableCreateXalian/AllowExecutionFromAPIGateway"
}

# TableRetrieveXalian :: GET /db/xalian
import {
  to = module.table_retrieve_xalian_lambda_module.aws_lambda_function.lambda_function
  id = "TableRetrieveXalian"
}
import {
  to = module.table_retrieve_xalian_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/TableRetrieveXalian"
}
import {
  to = module.table_retrieve_xalian_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/fa89yxu"
}
import {
  to = module.table_retrieve_xalian_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/dk02x49"
}
import {
  to = module.table_retrieve_xalian_lambda_module.aws_lambda_permission.apigw_permission
  id = "TableRetrieveXalian/AllowExecutionFromAPIGateway"
}

# TableRetrieveXalianBatch :: GET /db/xalians
import {
  to = module.table_retrieve_xalian_batch_lambda_module.aws_lambda_function.lambda_function
  id = "TableRetrieveXalianBatch"
}
import {
  to = module.table_retrieve_xalian_batch_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/TableRetrieveXalianBatch"
}
import {
  to = module.table_retrieve_xalian_batch_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/tavypeq"
}
import {
  to = module.table_retrieve_xalian_batch_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/tvi03ks"
}
import {
  to = module.table_retrieve_xalian_batch_lambda_module.aws_lambda_permission.apigw_permission
  id = "TableRetrieveXalianBatch/AllowExecutionFromAPIGateway"
}

# TableRetrieveXalianUser :: GET /db/user
import {
  to = module.table_retrieve_xalian_user_lambda_module.aws_lambda_function.lambda_function
  id = "TableRetrieveXalianUser"
}
import {
  to = module.table_retrieve_xalian_user_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/TableRetrieveXalianUser"
}
import {
  to = module.table_retrieve_xalian_user_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/jvbqbhg"
}
import {
  to = module.table_retrieve_xalian_user_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/d0vtsmk"
}
import {
  to = module.table_retrieve_xalian_user_lambda_module.aws_lambda_permission.apigw_permission
  id = "TableRetrieveXalianUser/AllowExecutionFromAPIGateway"
}

# TableCreateXalianUser :: POST /db/user
import {
  to = module.table_create_xalian_user_lambda_module.aws_lambda_function.lambda_function
  id = "TableCreateXalianUser"
}
import {
  to = module.table_create_xalian_user_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/TableCreateXalianUser"
}
import {
  to = module.table_create_xalian_user_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/3431u21"
}
import {
  to = module.table_create_xalian_user_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/9kkor46"
}
import {
  to = module.table_create_xalian_user_lambda_module.aws_lambda_permission.apigw_permission
  id = "TableCreateXalianUser/AllowExecutionFromAPIGateway"
}

# TableUpdateXalianUser :: PATCH /db/user
import {
  to = module.table_update_xalian_user_lambda_module.aws_lambda_function.lambda_function
  id = "TableUpdateXalianUser"
}
import {
  to = module.table_update_xalian_user_lambda_module.aws_cloudwatch_log_group.lambda_function_cloudwatch_group
  id = "/aws/lambda/TableUpdateXalianUser"
}
import {
  to = module.table_update_xalian_user_lambda_module.aws_apigatewayv2_integration.lambda_apigw_integration
  id = "6y8832nrlf/cd3xyxi"
}
import {
  to = module.table_update_xalian_user_lambda_module.aws_apigatewayv2_route.lambda_function_route
  id = "6y8832nrlf/u4jf2b9"
}
import {
  to = module.table_update_xalian_user_lambda_module.aws_lambda_permission.apigw_permission
  id = "TableUpdateXalianUser/AllowExecutionFromAPIGateway"
}

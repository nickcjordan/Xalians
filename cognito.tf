#########################################################
#####   COGNITO: TERRAFORM-MANAGED POST-CONFIRMATION  ###
#####   TRIGGER (issue #182)                           ##
#########################################################
# Fixes #182. Moves the Cognito post-confirmation trigger out of the Amplify-managed
# function `xalianSignUpSignInResourcePostConfirmation` (apps/web/amplify/backend/function/
# xalianSignUpSignInResourcePostConfirmation, deleted in this change) into Terraform +
# apps/api, alongside every other handler. The user pool itself
# (us-east-1_dDy7NYWbz, live since 2022, created by Amplify) is imported below so the
# `lambda_config.post_confirmation` pointer can be managed here; every other pool setting
# is a straight transcription of `aws cognito-idp describe-user-pool` captured in
# .live/user-pool.json on 2026-09-10 -- not a design choice -- so that this file's own
# `import` block produces exactly one in-place change (the trigger pointer) and nothing
# else. This whole file is additive and does not touch any resource declared in main.tf,
# to avoid conflicting with the parallel `feat/record-view` branch editing main.tf.

#########################################################
#####          NEW LAMBDA: POST CONFIRMATION        #####
#########################################################
# Not wired through terraform/modules/lambda: that module always creates an API Gateway
# route, and this function is invoked by Cognito, not API Gateway. Shares the lambda zip
# (apps/api/dist, see main.tf's archive_file.lambda_zip_file), the common exec role, and
# the bucket/object already declared in main.tf.
resource "aws_lambda_function" "post_confirmation" {
  function_name    = "XalianPostConfirmation"
  s3_bucket        = aws_s3_bucket.lambda_bucket.id
  s3_key           = aws_s3_object.lambda_bucket_object.key
  runtime          = "nodejs22.x"
  handler          = "postConfirmation/index.handler"
  source_code_hash = data.archive_file.lambda_zip_file.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
}

resource "aws_cloudwatch_log_group" "post_confirmation" {
  name              = "/aws/lambda/${aws_lambda_function.post_confirmation.function_name}"
  retention_in_days = 7
}

# Cognito needs explicit permission to invoke a Lambda trigger; unlike the API Gateway
# routes, there is no integration resource that implies this.
resource "aws_lambda_permission" "post_confirmation_cognito" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.xalians.arn
}

# Extends the shared exec role (aws_iam_role.lambda_exec, main.tf) rather than giving the
# post-confirmation function its own role: every other function already shares that role,
# and this keeps the "one role per deployment artifact" pattern main.tf established. The
# function's own least-privilege story is still scoped: this is the only statement on the
# shared role that touches cognito-idp, and it names this one pool ARN.
resource "aws_iam_role_policy" "post_confirmation_cognito" {
  name = "xalian-post-confirmation-cognito-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AddUserToGroup"
        Effect   = "Allow"
        Action   = ["cognito-idp:AdminAddUserToGroup"]
        Resource = aws_cognito_user_pool.xalians.arn
      },
    ]
  })
}
#####                                               #####
#########################################################


#########################################################
#####            COGNITO USER POOL (IMPORTED)       #####
#########################################################
# Imported live pool; see the file header for the "one in-place change" contract this
# config exists to satisfy.
resource "aws_cognito_user_pool" "xalians" {
  name = "xalianUserPool-dev"

  deletion_protection = "INACTIVE"
  mfa_configuration   = "OFF"

  auto_verified_attributes = ["email"]

  verification_message_template {
    email_message        = "Your verification code is {####}"
    email_subject        = "Your Xalian Verification Code"
    default_email_option = "CONFIRM_WITH_CODE"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  username_configuration {
    case_sensitive = false
  }

  user_pool_tier = "LITE"

  password_policy {
    minimum_length                   = 8
    require_uppercase                = false
    require_lowercase                = false
    require_numbers                  = false
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD"]
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = {}

  # This is the only intentional change on the pool this PR makes: the post-confirmation
  # trigger now points at the Terraform-managed function above instead of the deleted
  # Amplify function. The CI plan for this PR must show exactly this as an in-place
  # update to the pool, and nothing else -- see the file header.
  lambda_config {
    post_confirmation = aws_lambda_function.post_confirmation.arn
  }

  # Every standard OIDC attribute the live pool reports (.live/user-pool.json,
  # captured 2026-09-10), transcribed for documentation. Schema attributes are
  # immutable in Cognito -- any change here forces pool replacement -- and
  # describe-user-pool omits constraint details for some standard attributes (e.g.
  # "identities" reports an empty StringAttributeConstraints), so an exact byte-for-byte
  # match cannot be guaranteed from the API response alone. `schema` is ignored below for
  # that reason; these blocks exist so the live shape is visible in version control, not
  # because Terraform enforces them.
  schema {
    name                     = "sub"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = false
    required                 = true
    string_attribute_constraints {
      min_length = "1"
      max_length = "2048"
    }
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "email_verified"
    attribute_data_type      = "Boolean"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
  }

  schema {
    name                     = "phone_number"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  # "phone_number_verified" (21 chars) is a real standard attribute on the live pool
  # (.live/user-pool.json), but the aws provider's schema.name validation rejects any
  # name over 20 characters regardless of whether it is a standard or custom attribute --
  # a provider limitation, not a live-pool fact -- so it cannot be declared here. Omitted
  # rather than worked around; `ignore_changes = [schema]` above means this has no effect
  # on the live pool either way.
  schema {
    name                     = "profile"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "address"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "birthdate"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "10"
      max_length = "10"
    }
  }

  schema {
    name                     = "gender"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "preferred_username"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "updated_at"
    attribute_data_type      = "Number"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    number_attribute_constraints {
      min_value = "0"
    }
  }

  schema {
    name                     = "website"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "picture"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "identities"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "zoneinfo"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "locale"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "given_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "family_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "middle_name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  schema {
    name                     = "nickname"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "0"
      max_length = "2048"
    }
  }

  lifecycle {
    # This pool holds every real Xalians account. Cognito user pools cannot be recovered
    # once destroyed; nothing about this change should ever plan a destroy, but this is
    # the backstop if it somehow does.
    prevent_destroy = true

    ignore_changes = [
      # See the comment on the schema blocks above: describe-user-pool does not always
      # report enough detail to guarantee an exact match, and schema is ForceNew, so any
      # mismatch would plan a destructive pool replacement. Ignored entirely; the blocks
      # above stay for documentation.
      schema,
    ]
  }
}

import {
  to = aws_cognito_user_pool.xalians
  id = "us-east-1_dDy7NYWbz"
}
#####                                               #####
#########################################################

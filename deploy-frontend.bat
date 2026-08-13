@echo off
REM Hospital Management System - S3 Frontend Deployment Script (Windows)
REM Prerequisites: AWS CLI installed and configured
REM Usage: deploy-frontend.bat <bucket-name> <your-api-url>

setlocal enabledelayedexpansion

echo.
echo =====================================================
echo Hospital Management System - Frontend Deployment
echo =====================================================
echo.

REM Check if bucket name provided
if "%~1"=="" (
    echo Error: Bucket name required
    echo Usage: deploy-frontend.bat bucket-name api-url
    echo Example: deploy-frontend.bat hms-frontend-mybucket http://ec2-ip:5000/api
    exit /b 1
)

set BUCKET=%~1
set API_URL=%~2

if "%API_URL%"=="" (
    set API_URL=http://localhost:5000/api
)

echo 📋 Configuration:
echo   Bucket: %BUCKET%
echo   API URL: %API_URL%
echo.

REM Create .env file
echo 🔐 Creating .env file...
(
    echo REACT_APP_API_URL=%API_URL%
) > .env

REM Build React app
echo 🔨 Building React application...
call npm run build
if errorlevel 1 (
    echo Error: Build failed
    exit /b 1
)

echo ✅ Build successful!
echo.

REM Upload to S3
echo 📤 Uploading to S3...
aws s3 sync build s3://%BUCKET% --delete --cache-control "max-age=3600" ^
    --exclude ".env" --exclude "node_modules/*"

if errorlevel 1 (
    echo Error: S3 upload failed
    exit /b 1
)

echo ✅ Upload successful!
echo.

REM Invalidate CloudFront (optional)
echo 🔄 Would you like to invalidate CloudFront cache? (optional)
echo   You need the CloudFront Distribution ID
set /p DISTID="Enter Distribution ID (or press Enter to skip): "

if not "%DISTID%"=="" (
    echo 🔄 Invalidating CloudFront cache...
    aws cloudfront create-invalidation --distribution-id %DISTID% --paths "/*"
    echo ✅ CloudFront invalidation complete
)

echo.
echo =====================================================
echo ✅ Frontend deployment complete!
echo =====================================================
echo.
echo Your site should be available shortly at:
echo   https://%BUCKET%.s3.amazonaws.com
echo   or through CloudFront distribution

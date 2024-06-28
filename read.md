https://d27pin92gpowk0.cloudfront.net/355x503/web1.jpeg

# Deploying Modified AWS Serverless Image Handler

## 1. Clone the Repository

```powershell
git clone https://github.com/aws-solutions/serverless-image-handler.git
cd serverless-image-handler
```

## 2. Install Dependencies

Navigate through the project structure and install dependencies for each relevant directory:

```powershell
# In the source directory
cd source
npm ci
npm run install:dependencies

# In solution-utils
cd solution-utils
npm ci
npm run build:tsc

# In image-handler
cd ../image-handler
npm ci

# In constructs
cd ../constructs
npm ci
npm run build
```

## 3. Modify the Code

Make necessary modifications to the code, particularly in the `image-handler.ts` file, to customize the solution for your needs.

## 4. Configure AWS CLI

Ensure AWS CLI is installed and configured with the correct credentials:

```powershell
aws configure
```

## 5. Install CDK Globally

```powershell
npm install -g aws-cdk
```

## 6. Bootstrap CDK Environment

Navigate to the `constructs` directory and run:

```powershell
cd source/constructs
$env:overrideWarningsEnabled = "false"; npx cdk bootstrap --profile default
```

This creates the CDKToolkit stack with necessary resources for deployment.

## 7. Modify Bundling Configuration

Open `constructs/lib/back-end/back-end-construct.ts` and locate the `NodejsFunction` for the image handler. Add or modify the `bundling` option:

```typescript
const imageHandlerLambda = new NodejsFunction(this, 'ImageHandlerLambdaFunction', {
  // ... other properties ...
  bundling: {
    externalModules: ["sharp"],
    nodeModules: ["sharp"],
    commandHooks: {
      beforeBundling(inputDir: string, outputDir: string): string[] {
        return [];
      },
      beforeInstall(inputDir: string, outputDir: string): string[] {
        return [];
      },
      afterBundling(inputDir: string, outputDir: string): string[] {
        return [`cd ${outputDir}`, "rimraf node_modules/sharp && npm install --arch=x64 --platform=linux sharp"];
      },
    },
  }
});
```

## 8. Install rimraf

Install `rimraf` as a development dependency:

```powershell
npm install --save-dev rimraf
```

## 9. Deploy the Stack

Run the deployment command:

```powershell
$env:overrideWarningsEnabled = "false"; npx cdk deploy --parameters DeployDemoUIParameter=No --parameters SourceBucketsParameter=toberesized --profile default
```

Replace `toberesized` with your actual source S3 bucket name.

## 10. Monitor Deployment

The CDK will now deploy your stack using CloudFormation. This process may take several minutes. Monitor the output for any errors or warnings.

## 11. Verify Deployment

Once the deployment is complete, verify the stack in the AWS CloudFormation console. You should see your newly created or updated stack with all the resources.


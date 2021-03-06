import { Construct, CfnParameter } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";

export interface BaseLambdaApiProps {
    lambdaName: string;
    artifactLocation: s3.Location;
    handler: string;
}

export class BaseLambdaApi extends Construct {
    readonly lambdaFunction: lambda.Function;

    constructor(parent: Construct, name: string, props: BaseLambdaApiProps) {
        super(parent, name);

        const artifact = s3.Bucket.fromBucketName(parent, "LambdaCodeBucket", 
            props.artifactLocation.bucketName
        );
        
        const bucketNameParam = new CfnParameter(this, "StackCodeBucketName");
        const objectKeyParam = new CfnParameter(this, "StackCodeObjectKey");
        bucketNameParam.overrideLogicalId("StackCodeBucketName");
        objectKeyParam.overrideLogicalId("StackCodeObjectKey");
        const code = lambda.Code.fromCfnParameters({
            bucketNameParam,
            objectKeyParam
        })
        this.lambdaFunction = new lambda.Function(this, "BaseLambdaName", {
            code,
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: props.handler
        });
    }
}
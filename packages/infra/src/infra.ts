import { CIPipeline } from "@fxaa/constructs";
import {App, Stack} from "@aws-cdk/core";

const app = new App();

const stack = new Stack(app, "AppBuilder", {
    stackName: "TestStack",
    description: "Meta stack for building stuff",
    env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_REGION
    },
    tags: {
        "project": "aws-infra-poc"
    }
});

const pipeline = new CIPipeline(stack, "TestPipeline", {
    repositoryName: "aws-infra-poc",
    stackName: stack.stackName,
    sourceOptions: {
        owner: "fxaa",
        repoName: "aws-infra-poc",
        token: process.env.SOURCE_TOKEN ?? "",
    }
});

app.synth();

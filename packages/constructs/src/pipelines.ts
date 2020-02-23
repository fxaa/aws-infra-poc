import * as codePipeline from "@aws-cdk/aws-codepipeline";
import * as codePipelineActions from "@aws-cdk/aws-codepipeline-actions";
import * as codeBuild from "@aws-cdk/aws-codebuild";
import * as sns from "@aws-cdk/aws-sns";
import { Construct, SecretValue } from "@aws-cdk/core";
import { BuildSpec } from "@aws-cdk/aws-codebuild";

export enum Environment {
    Dev = "dev",
    Alpha = "alpha",
    Beta = "beta",
    Gamma = "gamma",
    Prod = "prod"
}

export interface CIPipelineProps {
    readonly repositoryName: string;
    readonly stackName: string;
    readonly sourceOptions: {
        owner: string;
        repoName: string;
        token: string;
    };
}

export class CIPipeline extends Construct {
    readonly pipeline: codePipeline.Pipeline;
    readonly successTopic: sns.Topic;
    readonly failureTopic: sns.Topic;

    constructor(parent: Construct, name: string, props: CIPipelineProps) {
        super(parent, name);

        const pipelineName = `${name}-Pipeline`;
        this.pipeline = new codePipeline.Pipeline(this, `${name}`, {
            pipelineName,
        });
        this.successTopic = new sns.Topic(this.pipeline, `${pipelineName}-Complete`);
        this.failureTopic = new sns.Topic(this.pipeline, `${pipelineName}-Failed`);

        const repoSourceArtifact = new codePipeline.Artifact(`${name}-RepoArtifact`);
        const repoBuildArtifact = new codePipeline.Artifact(`${name}-BuildArtifact`);

        const oauth = SecretValue.secretsManager("GithubPersonalAccessToken");
        const sourceAction = new codePipelineActions.GitHubSourceAction({
            output: repoSourceArtifact,
            actionName: "Checkout",
            repo: props.sourceOptions.repoName,
            owner: props.sourceOptions.owner,
            oauthToken: oauth
        });

        const buildProject = new codeBuild.PipelineProject(this, `${name}-Build`, {
            projectName: `${name}-Project`,
            description: `Build step for the ${name} pipeline`,
            environment: {
                buildImage: codeBuild.LinuxBuildImage.AMAZON_LINUX_2_2,
                computeType: codeBuild.ComputeType.SMALL,
            },
        });

        const buildAction = new codePipelineActions.CodeBuildAction({
            actionName: `Build-${name}-Project`,
            project: buildProject,
            input: repoSourceArtifact,
            outputs: [ repoBuildArtifact ]
        });

        const deployActions = [
            new codePipelineActions.CloudFormationCreateReplaceChangeSetAction({
                actionName: `${name}-PrepareChanges`,
                runOrder: 1,
                stackName: `${props.stackName}`,
                changeSetName: `${props.stackName}-ChangeSet`,
                templatePath: new codePipeline.ArtifactPath(repoBuildArtifact, `${name}-Changes.yml`),
                adminPermissions: true
            }),
            new codePipelineActions.CloudFormationExecuteChangeSetAction({
                actionName: `${name}-ExecuteChanges`,
                runOrder: 2,
                stackName: `${props.stackName}`,
                changeSetName: `${props.stackName}-ChangeSet`
            })
        ];

        this.pipeline.addStage({
            stageName: "Source",
            actions: [sourceAction]
        });
        this.pipeline.addStage({
            stageName: "Build",
            actions: [buildAction]
        });
        this.pipeline.addStage({
            stageName: "Deploy",
            actions: [...deployActions]
        });
    }
}
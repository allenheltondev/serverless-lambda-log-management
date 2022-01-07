const { CloudWatchLogsClient, DescribeLogGroupsCommand, DeleteLogGroupCommand } = require("@aws-sdk/client-cloudwatch-logs");
const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');
const logs = new CloudWatchLogsClient();
const lambda = new LambdaClient();

exports.handler = async (event) => {
  let success = true;
  try {
    const functionNames = await exports.getFunctionNames();
    if (functionNames && functionNames.length) {
      const logGroupNames = await exports.getFunctionLogGroupNames();
      const logGroupsToDelete = logGroupNames.filter(lgn => !functionNames.includes(lgn));
      if(logGroupsToDelete?.length){
        await exports.deleteUnusedLogGroups(logGroupsToDelete);
      }

      console.info(`Deleted ${logGroupsToDelete.length} unused log groups`);
    }
  }
  catch (err) {
    console.error(err);
    success = false;
  }

  return { success };
};

exports.getFunctionNames = async () => {
  let functionNames = [];
  const params = {};
  do {
    const response = await lambda.send(new ListFunctionsCommand(params));
    params.Marker = response.NextMarker;
    functionNames = functionNames.concat(response.Functions.map(f => `/aws/lambda/${f.FunctionName}`));
  } while (params.Marker);

  return functionNames;
};


exports.getFunctionLogGroupNames = async () => {
  let logGroups = [];
  const params = exports.buildDescribeLogGroupsCommandInput();
  do {
    const response = await logs.send(new DescribeLogGroupsCommand(params));
    params.nextToken = response.nextToken;
    logGroups = logGroups.concat(response.logGroups.map(lg => lg.logGroupName));
  } while (params.nextToken);

  return logGroups;
};

exports.buildDescribeLogGroupsCommandInput = () => {
  const params = {
    limit: 50,
    logGroupNamePrefix: '/aws/lambda/'
  };

  return params;
};

exports.deleteUnusedLogGroups = async (logGroupNames) => {
  await Promise.all(logGroupNames.map(async (logGroupName) => {
    await logs.send(new DeleteLogGroupCommand({ logGroupName }));
  }));
};
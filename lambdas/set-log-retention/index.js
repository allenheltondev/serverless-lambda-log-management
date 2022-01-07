const { CloudWatchLogsClient, DescribeLogGroupsCommand, PutRetentionPolicyCommand } = require("@aws-sdk/client-cloudwatch-logs");
const logs = new CloudWatchLogsClient();

exports.handler = async (event) => {
  let success = true;
  try {
    const logGroupsToUpdate = await exports.getLambdaLogGroupsToUpdate();
    if (logGroupsToUpdate?.length) {
      await exports.setLogGroupRetentionPolicy(logGroupsToUpdate);
    }
  }
  catch (err) {
    console.error(err);
    success = false;
  }

  return { success };
};


exports.getLambdaLogGroupsToUpdate = async () => {
  let logGroups = [];
  const params = exports.buildDescribeLogGroupsCommandInput();
  do {
    const response = await logs.send(new DescribeLogGroupsCommand(params));
    params.nextToken = response.nextToken;
    logGroups = logGroups.concat(response.logGroups.filter(lg => lg.retentionInDays !== process.env.RETENTION_DAYS).map(lg => lg.logGroupName));
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

exports.setLogGroupRetentionPolicy = async (logGroups) => {
  await Promise.all(logGroups.map(async (logGroupName) => {
    const params = exports.buildPutRetentionPolicyCommandInput(logGroupName);
    await logs.send(new PutRetentionPolicyCommand(params));
  }));
};

exports.buildPutRetentionPolicyCommandInput = (logGroupName) => {
  const params = {
    logGroupName: logGroupName,
    retentionInDays: parseInt(process.env.RETENTION_DAYS)
  };

  return params;
};
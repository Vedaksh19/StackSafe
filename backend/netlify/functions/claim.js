exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  // Simulate claim
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Claim successful!",
      received: body,
    }),
  };
};
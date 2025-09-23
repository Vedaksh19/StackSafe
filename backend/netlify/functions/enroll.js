exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  // Simulate enrollment
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Enrollment confirmed!",
      received: body,
    }),
  };
};
exports.handler = async (event) => {
  // Simulate ping
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Ping recorded!",
      timestamp: Date.now(),
    }),
  };
};
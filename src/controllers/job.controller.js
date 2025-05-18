export const jobsController = (req, res) => {
  try {
    return res.status(200).json({ message: "Hello World from jobs" });
  } catch (error) {
    console.error("Error in jobsController:", error);
    return res.status(500).json({ message: "Errors in getting jobs" });
  }
};

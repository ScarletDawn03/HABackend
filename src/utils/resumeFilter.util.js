export function getFormattedResumeFilter(ontology) {
  if (!Array.isArray(ontology)) return "Invalid input";
  return ontology
    .map(
      (item, index) =>
        `${index + 1}. ${item?.field ?? "NA"}: ${item?.requirement ?? "NA"}`
    )
    .join("\n");
}

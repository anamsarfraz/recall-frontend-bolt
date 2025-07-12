export const getPublicImageUrl = (imagePath: string) => {
  if (!imagePath) {
    // Return a fallback image if no path provided
    return "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800";
  }
  
  const baseUrl = "https://videoindex.app";
  const relativePath = imagePath.replace(
    "/home/azureuser/recallstore/recall-api/../recallhq",
    ""
  );
  return `${baseUrl}/${relativePath}`;
};

export const getPublicVideoUrl = (videoPath: string) => {
  const baseUrl = "https://videoindex.app";
  if (videoPath !== undefined && videoPath !== null && videoPath !== "") {
    const relativePath = videoPath.replace(
      /^.*?\/recallhq\/temp\//, // Match everything up to "/recallhq/temp/"
      ""
    );
    return `${baseUrl}/${relativePath}`;
  }
  return baseUrl;
};

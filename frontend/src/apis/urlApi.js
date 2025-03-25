const API_BASE_URL =
  process.env.NODE_ENV == "production"
    ? process.env.NEXT_PUBLIC_DEPLOY_API_URL
    : process.env.NEXT_PUBLIC_LOCAL_API_URL;

export const shortenURL = async (originalURL) => {
  try {
    const response = await fetch(`${API_BASE_URL}/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ originalURL }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors.map((err) => err.msg).join(", "));
    }

    return data.shortURL;
  } catch (error) {
    // cconnection error
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      throw new Error("Error occurs when connecting to server");
    }
    throw error;
  }
};

import { useState } from "react";
import { toast } from "react-toastify";

import { shortenURL } from "@apis/urlApi";

export default function useShortenURL() {
  const [originalURL, setOriginalURL] = useState("");
  const [shortURL, setShortURL] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleShorten = async () => {
    setIsLoading(true);

    try {
      const result = await shortenURL(originalURL);
      setShortURL(result);
      toast.success("Successfully shorten your URL!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shortURL) {
      navigator.clipboard.writeText(shortURL);
      toast.info("Copied shorten URL!");
    } else {
      toast.warn("You haven't shortened any URLs yet.");
    }
  };

  return {
    originalURL,
    setOriginalURL,
    shortURL,
    isLoading,
    handleShorten,
    handleCopy,
  };
}

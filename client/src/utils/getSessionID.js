const getSessionID = () => {
  const sessionID = localStorage.getItem("sessionID");

  if (!sessionID) {
    return null;
  }

  try {
    if (sessionID.length !== 32) {
      localStorage.removeItem("sessionID");
      return null;
    }

    const hexPattern = /^[0-9a-f]{32}$/i;
    if (!hexPattern.test(sessionID)) {
      localStorage.removeItem("sessionID");
      return null;
    }

    return sessionID;
  } catch (e) {
    localStorage.removeItem("sessionID");
    return null;
  }
};

export default getSessionID;

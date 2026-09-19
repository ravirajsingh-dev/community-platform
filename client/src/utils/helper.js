import { UserStatuses } from "@src/constants/index";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";

import { jwtDecode } from "jwt-decode";

export const capitalizeFirst = (text) => {
  if (!text) return "";
  const [first, ...rest] = text;
  return first.toUpperCase() + rest.join("");
};

export const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      times.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return times;
};

export const capitalizeFirstLetterOfEachWord = (text) => {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const capitalizeAll = (text) => {
  if (!text) return "";
  return text
    .split("")
    .map((char) => char.toUpperCase())
    .join("");
};

export const lowercaseAll = (text) => {
  if (!text) return "";
  return text.toLowerCase();
};

export const isAdmin = (user) => {
  return user && user.role === 2 ? true : false;
};

export const goBack = (navigate) => {
  try {
    navigate(-1);
  } catch (err) {
    navigate("/");
  }
};

export const decodeToken = (token) => {
  if (typeof token !== "string" || token.split(".").length !== 3) {
    throw new Error("Invalid token specified: missing part #2");
  }
  return jwtDecode(token);
};

export const handleTableChange = (
  type,
  searchText,
  sortingParams,
  setUserParams,
  searchFields
) => {
  const { limit, page } = sortingParams;
  let params = {
    limit: limit,
    page: type === "search" ? 1 : page ? page : 1,
  };

  let filters = [];
  if (type === "search") {
    if (searchText.length > 0) {
      filters = sortingParams.filters.includes(type)
        ? sortingParams.filters
        : [...sortingParams.filters, type];

      const query = searchFields.reduce((acc, field) => {
        acc[field.name] = { value: searchText, type: field.type };
        return acc;
      }, {});

      params = {
        ...params,
        query: {
          ...sortingParams.query,
          [type]: query,
        },
        filters,
      };
    } else {
      filters = sortingParams.filters.filter((item) => item !== type);
      const temp = {};
      params = {
        ...sortingParams,
        filters,
      };
      for (const key in params.query) {
        if (key === type) continue;
        temp[key] = params.query[key];
      }
      params.query = temp;
    }
  }

  setUserParams(params);
};

export const generateRandomNumberString = (length = 6) => {
  const characters = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const handleNumberInput = (event) => {
  const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight"];

  if (!/[0-9]/.test(event.key) && !allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
};

export const formatIndianNumber = (number) => {
  if (number == null) return "0"; // or return "0" or any other default value you prefer

  const [integerPart, decimalPart] = number.toString().split(".");

  const lastThreeDigits = integerPart.slice(-3);
  const otherDigits = integerPart.slice(0, -3);

  const formattedNumber =
    otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
    (otherDigits ? "," : "") +
    lastThreeDigits;

  return decimalPart ? formattedNumber + "." + decimalPart : formattedNumber;
};

export const getExpiryCountdown = (expiryTimestamp) => {
  if (!expiryTimestamp) {
    return "Invalid date";
  }

  const now = Date.now(); // Current time in milliseconds
  const expiryTime = new Date(expiryTimestamp).getTime(); // Convert ISO date string to timestamp

  if (isNaN(expiryTime)) {
    return "Invalid date";
  }

  const timeDifference = expiryTime - now;

  // If the expiry timestamp is in the past
  if (timeDifference <= 0) {
    return "Expired";
  }

  // Calculate days, hours, minutes, and seconds
  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

  // Format the output based on remaining time
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const getUserStatus = (status) => {
  const findStatus = UserStatuses.find((i) => i.value === status);

  if (!findStatus) {
    return status;
  }

  return findStatus.label;
};

export const formatLastLoginTime = (time) => {
  if (!time) {
    return "";
  }

  const date = typeof time === "string" ? parseISO(time) : new Date(time);
  if (!isValid(date)) {
    return "";
  }

  return formatDistanceToNow(date, { addSuffix: true });
};

export const toRoman = (num = 0) => {
  if (typeof num !== "number" || num < 0 || num >= 4000) {
    throw new Error("Input must be a number between 0 and 3999");
  }

  if (num === 0) return "";

  const romanMap = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";

  for (const { value, numeral } of romanMap) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }

  return result;
};

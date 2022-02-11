import { Hub } from "aws-amplify";

export const sendAlert = (title, text, variant = "dark") => {
  Hub.dispatch("alert", {
    event: "new-alert",
    data: {
      variant: variant,
      title: title,
      text: text,
    },
    message: null,
  });
};

export const hideAlert = () => {
  Hub.dispatch("alert", { event: "hide-alert", data: null, message: null });
};

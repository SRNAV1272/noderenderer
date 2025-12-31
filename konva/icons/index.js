import { renderEmailIcon } from "./emailIcon.js";
import { renderFaxIcon } from "./faxIcon.js";
import { renderWebsiteIcon } from "./websiteIcon.js";
import { renderLocationIcon } from "./locationIcon.js";
import { renderMobileIcon } from "./mobileIcon.js";
import { renderPhoneIcon } from "./phoneIcon.js";

export function renderIcon({ key, ...props }) {
  if (key === "email") return renderEmailIcon(props);
  if (key === "fax") return renderFaxIcon(props);
  if (key === "website") return renderWebsiteIcon(props);
  if (key === "addressLine1") return renderLocationIcon(props);
  if (key === "mobileNumber") return renderMobileIcon(props);
  if (key === "landlineNumber") return renderPhoneIcon(props);
  return null;
}

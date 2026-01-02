import { loadImage } from "canvas";

export async function loadImageSafe(src) {
    if (!src) return null;
    try {
        return await loadImage(src);
    } catch (e) {
        console.warn("⚠️ Image load failed:", src);
        return null;
    }
}

export const updateFieldsFromCard = (card, BASE_URL) => (prevFields) => {
    if (!card) return prevFields;
    let youtubeIndex = 0; // for duplicate socials

    return prevFields.map((field) => {
        // ==========================
        // ✅ BASIC TEXT MAPPINGS
        // ==========================
        // ✅ FULL NAME = prefix + firstName + lastName
        if (field.key === "fullName") {
            const prefix = card.prefix ?? "";
            const firstName = card.firstName ?? "";
            const lastName = card.lastName ?? "";

            const fullName = [prefix, firstName, lastName]
                .filter(Boolean)
                .join(" ");

            return {
                ...field,
                value: fullName,
                // show: Boolean(fullName)   // hide if empty
            };
        }
        if (field.key === "designation") return { ...field, value: card.designation ?? "" };
        if (field.key === "companyName") return { ...field, value: card.companyName ?? "" };
        if (field.key === "website") return { ...field, value: card.website ?? "" };

        // ==========================
        // ✅ PROFILE PHOTO
        // ==========================
        if (field.key === "profilePhoto") {
            return {
                ...field,
                value: card.profileImage
                    ? `${BASE_URL}/v2/getCardProfileImage/${card.profileImage}`
                    : "",
                show: field.show,
            };
        }

        // ==========================
        // ✅ CUSTOM TEXT SAFETY
        // ==========================
        if (field?.key?.startsWith("customText-")) {
            return field; // DO NOT TOUCH
        }

        // ==========================
        // ✅ EMAIL MAPPING (MULTIPLE)
        // ==========================
        if (field.key?.startsWith("email")) {
            const index = Number(field.key.replace("email", "")) || 0;
            const value = card.email?.[index] ?? "";
            return {
                ...field,
                value,
                // show: Boolean(value && !card.hiddenEmail?.[index])
            };
        }

        // ==========================
        // ✅ MOBILE MAPPING
        // ==========================
        if (field.key?.startsWith("mobileNumber")) {
            const index = Number(field.key.replace("mobileNumber", "")) || 0;
            const mobile = card.mobileNumber?.[index];

            const value = mobile
                ? `${mobile.countryCode} ${mobile.number}`
                : "";

            return {
                ...field,
                value,
                // show: Boolean(value && !card.hiddenMobile?.[index])
            };
        }
        if (field.key?.startsWith("fax")) {
            const index = Number(field.key.replace("fax", "")) || 0;
            const value = card.fax?.[index] ?? "";

            return {
                ...field,
                value,
                // show: Boolean(value && !card.hiddenFax?.[index])
            };
        }

        // ==========================
        // ✅ LANDLINE
        // ==========================
        if (field.key?.startsWith("landlineNumber")) {
            const index = Number(field.key.replace("landlineNumber", "")) || 0;
            const value = card.landlineNumber?.[index] ?? "";

            return {
                ...field,
                value,
                // show: Boolean(value && !card.hiddenLandline?.[index])
            };
        }

        // ==========================
        // ✅ ADDRESS
        // ==========================
        if (field.key === "addressLine1") return { ...field, value: card.address?.addressLine1 ?? "" };
        if (field.key === "addressLine2") return { ...field, value: card.address?.addressLine2 ?? "" };
        if (field.key === "city") return { ...field, value: card.address?.city ?? "" };
        if (field.key === "state") return { ...field, value: card.address?.state ?? "" };
        if (field.key === "country") return { ...field, value: card.address?.country ?? "" };
        if (field.key === "pincode") return { ...field, value: card.address?.pinCode ?? "" };
        if (field.key === "qrCode") {
            return {
                ...field,
                link: card?.shareLink ?? "",
                show: field.show,
            };
        }
        // ==========================
        // ✅ SOCIAL LINKS (MULTI YOUTUBE SAFE)
        // ==========================
        if (field?.name) {
            const entries = card.social?.filter(
                soc => soc.socialMediaName === field.name
            );

            const social = entries?.[youtubeIndex] || entries?.[0];

            if (field.name === "youtube") youtubeIndex++;

            return social
                ? { ...field, link: social.value }
                : { ...field, link: "", show: false };
        }

        // ==========================
        // ✅ DEFAULT
        // ==========================
        return field;
    });
};

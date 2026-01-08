export function generateEmailSignatureHTML(
    dataURL,
    allFields = [],
    freshLinkForBanner,
    showBanner
) {
    const disclaimerField = allFields.find(
        f => f.key === "disclaimer" && f.show
    );

    const normalLinks = allFields
        .filter(i => i?.key?.toLowerCase()?.startsWith("social"))
        .filter(i => !["teams", "meet", "calendly", "pdf", "url"].includes(i?.name))
        .filter(i => i?.show);

    const buttonLinks = allFields
        .filter(i => i?.key?.toLowerCase()?.startsWith("social"))
        .filter(i => ["teams", "meet", "calendly", "pdf", "url"].includes(i?.name))
        .filter(i => i?.show);

    /* ---------- MAIN SIGNATURE CARD (450px) ---------- */
    const signatureImageHTML =
        typeof dataURL === "string" && dataURL.trim()
            ? `
          <tr>
            <td style="padding-bottom:8px;">
              <img
                src="${dataURL}"
                alt="Signature"
                width="450"
                style="
                  display:block;
                  width:450px;
                  height:auto;
                  border:1px solid #ddd;
                  border-radius:8px;
                "
              />
            </td>
          </tr>
        `
            : "";

    /* ---------- SOCIAL ICONS + CTA BUTTONS ---------- */
    const combinedLinks = [...normalLinks, ...buttonLinks];
    const BUTTON_TYPES = ["teams", "meet", "calendly", "pdf", "url"];

    const sortedLinks = [...combinedLinks].sort((a, b) => {
        const aIsButton = BUTTON_TYPES.includes(a?.name);
        const bIsButton = BUTTON_TYPES.includes(b?.name);

        const aLabelEmpty = !a?.label || !String(a.label).trim();
        const bLabelEmpty = !b?.label || !String(b.label).trim();

        // 1️⃣ Non-buttons first
        if (!aIsButton && bIsButton) return -1;
        if (aIsButton && !bIsButton) return 1;

        // 2️⃣ Among buttons → empty label first
        if (aIsButton && bIsButton) {
            if (aLabelEmpty && !bLabelEmpty) return -1;
            if (!aLabelEmpty && bLabelEmpty) return 1;
        }

        // 3️⃣ Keep original order
        return 0;
    });

    const combinedLinksHTML = combinedLinks.length
        ? `
                <tr>
                  <td style="padding-top:8px;">
                    ${sortedLinks
            .map(link => {
                const isButton = BUTTON_TYPES.includes(link?.name);

                return `
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                          style="display:inline-table;margin-right:8px;margin-bottom:8px;">
                          <tr>
                            <td valign="middle">
                              ${isButton
                        ? `
                        <a href="${link?.link}" target="_blank"
                          style="
                            display:inline-block;
                            padding:${!!link?.label ? "4px 8px" : "0px 0px"};
                            border: ${!!link?.label ? "1px solid #0b2e79ff" : ""};
                            border-radius:22px;
                            font-size:10px;
                            font-family:Arial, sans-serif;
                            color:#000;
                            text-decoration:none;
                            white-space:nowrap;
                          ">
                          ${link?.value
                            ? `<img src="${link.value}" width="${!!link?.label ? 18 : 20}" style="vertical-align:middle;margin-right:6px;" />`
                            : ""
                        }
                          ${link?.label}
                        </a>`
                        : `
                        <a href="${link?.link}" target="_blank"
                          style="
                            display:inline-block;
                            padding:0px 0px;
                            border-radius:22px;
                            font-size:13px;
                            font-family:Arial, sans-serif;
                            color:#000;
                            text-decoration:none;
                            white-space:nowrap;
                          ">
                          ${link?.value
                            ? `<img src="${link.value}" width="${20}" style="vertical-align:middle;margin-right:6px;" />`
                            : ""
                        }
                        </a>`
                    }
                            </td >
                          </tr >
                        </table > `;
            })
            .join("")}
                          </td>
                </tr>
              `
        : "";

    /* ---------- BANNER (450px LOCKED) ---------- */
    const bannerHTML =
        typeof freshLinkForBanner === "string" &&
            freshLinkForBanner.trim() &&
            showBanner
            ? `
<tr>
  <td style="padding-top:8px;">
    <!--[if mso]>
    <table width="450" cellpadding="0" cellspacing="0" border="0"><tr><td>
    <![endif]-->

    <img
      src="${freshLinkForBanner}"
      alt=""
      width="450"
      height="110"
      style="
        display:block;
        width:450px;
        height:110px;
        border:0;
      "
    />

    <!--[if mso]></td></tr></table><![endif]-->
  </td>
</tr>`
            : "";

    /* ---------- DISCLAIMER ---------- */
    const disclaimerHTML = disclaimerField
        ? `
<tr>
  <td style="padding-top:8px;">
    <p style="
      margin:0;
      font-size:11px;
      line-height:1.45;
      color:#777;
      font-family:Arial, sans-serif;">
      ${disclaimerField.value.replace(/\n+/g, " ")}
    </p>
  </td>
</tr>`
        : "";

    /* ---------- FINAL WRAPPER (HARD WIDTH) ---------- */
    return `
<table
  cellpadding="0"
  cellspacing="0"
  border="0"
  width="450"
  style="
    width:450px;
    font-family:Arial, sans-serif;
  "
>
  ${signatureImageHTML}
  ${combinedLinksHTML}
  ${bannerHTML}
  ${disclaimerHTML}
</table>
`.trim();
}

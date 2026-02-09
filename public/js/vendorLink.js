(() => {
  if (window.__vendorLinkInjected) return;
  window.__vendorLinkInjected = true;

  const wrapper = document.createElement("div");
  wrapper.className = "floating-actions";

  const vendorLink = document.createElement("a");
  vendorLink.href = "/vendor";
  vendorLink.textContent = "Vendor dashboard";
  vendorLink.className = "floating-link floating-vendor";
  vendorLink.setAttribute("aria-label", "Vendor dashboard");

  const customerLink = document.createElement("a");
  customerLink.href = "/";
  customerLink.textContent = "Customer dashboard";
  customerLink.className = "floating-link floating-customer";
  customerLink.setAttribute("aria-label", "Customer dashboard");

  wrapper.appendChild(vendorLink);
  wrapper.appendChild(customerLink);

  document.body.appendChild(wrapper);
})();

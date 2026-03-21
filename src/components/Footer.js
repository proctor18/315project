"use client";

export default function Footer() {
  return (
    <footer className="appFooter">
      {/* Top Section */}
      <div className="footerTop">
        <div className="footerRow">
          {/* Categories */}
          <div className="footerCol">
            <p className="footerHeading">Categories</p>
            <span className="footerLink">Textbooks</span>
            <span className="footerLink">Books</span>
            <span className="footerLink">Electronics</span>
            <span className="footerLink">Lab Equipments</span>
          </div>

          {/* Help */}
          <div className="footerCol">
            <p className="footerHeading">Help</p>
            <span className="footerLink">Account</span>
            <span className="footerLink">FAQ</span>
            <span className="footerLink">How to rent</span>
          </div>

          {/* Legal */}
          <div className="footerCol">
            <p className="footerHeading">Legal</p>
            <span className="footerLink">Terms of Use</span>
            <span className="footerLink">Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="footerBottom">
        <p className="footerBrand">RENTIFY</p>
      </div>
    </footer>
  );
}
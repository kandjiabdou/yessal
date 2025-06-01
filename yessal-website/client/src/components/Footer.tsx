import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold font-heading mb-4">Yessal</h3>
            <p className="text-gray-400 mb-4">
              {t("footer.description")}
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <FontAwesomeIcon icon={["fab", "facebook-f"]} />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <FontAwesomeIcon icon={["fab", "instagram"]} />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="WhatsApp"
              >
                <FontAwesomeIcon icon={["fab", "whatsapp"]} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">{t("footer.services.title")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/tarifs" className="text-gray-400 hover:text-white transition-colors">
                  {t("service.standard.title")}
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="text-gray-400 hover:text-white transition-colors">
                  {t("service.ironing.title")}
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="text-gray-400 hover:text-white transition-colors">
                  {t("service.drycleaning.title")}
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="text-gray-400 hover:text-white transition-colors">
                  {t("footer.services.special")}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">{t("footer.links.title")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="text-gray-400 hover:text-white transition-colors">
                  {t("nav.pricing")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  {t("nav.contact")}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">{t("footer.contact.title")}</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <FontAwesomeIcon 
                  icon="map-marker-alt" 
                  className="mt-1 mr-2 text-primary" 
                />
                <span className="text-gray-400">{t("contact.address")}</span>
              </li>
              <li className="flex items-start">
                <FontAwesomeIcon 
                  icon="phone" 
                  className="mt-1 mr-2 text-primary" 
                />
                <span className="text-gray-400">{t("contact.phone")}</span>
              </li>
              <li className="flex items-start">
                <FontAwesomeIcon 
                  icon="envelope" 
                  className="mt-1 mr-2 text-primary" 
                />
                <span className="text-gray-400">{t("contact.email")}</span>
              </li>
              <li className="flex items-start">
                <FontAwesomeIcon 
                  icon="clock" 
                  className="mt-1 mr-2 text-primary" 
                />
                <span className="text-gray-400">{t("contact.hours")}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} Yessal. {t("footer.rights")}
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                {t("footer.privacy")}
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm">
                {t("footer.terms")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

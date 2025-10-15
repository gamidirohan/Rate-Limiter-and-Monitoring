import styles from "./style.module.scss";
import { motion, AnimatePresence } from "framer-motion";
import { height } from "../anim";
import Body from "./body/Body";
import { useState } from "react";


function Nav() {
  const links = [
    {
      title: "Dashboard",
      href: "/",
    },
    {
      title: "API Keys",
      href: "/api-management",
    },
    {
      title: "Settings",
      href: "/settings",
    },
  ];

  const [selectedLink, setSelectedLink] = useState({
    isActive: false,
    index: 0,
  });

  return (
    <motion.div
      className={styles.nav}
      variants={height}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <Body
            links={links}
            selectedLink={selectedLink}
            setSelectedLink={setSelectedLink}
          />
        </div>
        {/* ImageComponent removed as per request */}
      </div>
    </motion.div>
  );
}

export default Nav;

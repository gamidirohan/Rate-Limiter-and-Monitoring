import styles from "./style.module.scss";
import { opacity } from "../../anim";
import { motion } from "framer-motion";
import Image from "next/image";

function ImageComponent({ src, isActive }) {
  return (
    <motion.div
      variants={opacity}
      animate={isActive ? "open" : "closed"}
      className={styles.imageContainer}
    >
      <Image src={`/images/${src}`} fill={true} alt="image" />
    </motion.div>
  );
}

export default ImageComponent;

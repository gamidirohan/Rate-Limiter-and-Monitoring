import Link from 'next/link';
import styles from './style.module.scss';
import { motion } from 'framer-motion';
import { translate, blur } from '../../anim';

function Body({ links, selectedLink, setSelectedLink }) {
  const getChars = (word) => {
    let chars = [];
    word.split('').forEach((char, i) => {
      chars.push(
        <motion.span
          custom={[i * 0.02, (word.length - i) * 0.01]}
          variants={translate}
          initial="initial"
          animate="enter"
          exit="exit"
          key={`c_${i}`}
        >
          {char}
        </motion.span>,
      );
    });

    return chars;
  };

  return (
    <div className={styles.body}>
      {links.map((link, index) => {
        const { title, href } = link;
        return (
          <Link href={href} key={`l_${index}`}>
            <motion.p
              onMouseOver={() => {
                setSelectedLink({ isActive: true, index });
              }}
              onMouseLeave={() => {
                setSelectedLink({ isActive: false, index });
              }}
              variants={blur}
              initial="initial"
              animate={
                selectedLink.isActive && selectedLink.index != index
                  ? 'open'
                  : 'closed'
              }
            >
              {getChars(title)}
            </motion.p>
          </Link>
        );
      })}
    </div>
  );
}

export default Body;

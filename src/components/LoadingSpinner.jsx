import styles from './LoadingSpinner.module.scss';

export default function LoadingSpinner({ fullScreen = false }) {
  return (
    <div className={`${styles.spinnerContainer} ${fullScreen ? styles.fullScreen : ''}`}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
}

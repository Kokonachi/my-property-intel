/* Galaxy / Uiverse glass card by joe-watson-sbf (MIT). See vendor/ATTRIBUTION.md */
import styles from './GalaxyCard.module.css'

export default function GalaxyCard({
  title = 'GLASS EFFECT',
  name = 'JOE WATSON SBF',
  detail = '0000 000 000 0000',
  metaLabel = 'VALID',
  metaValue = '01/28',
  className = '',
}) {
  const cls = className ? `${styles.container} ${className}` : styles.container
  return (
    <div className={cls}>
      <div className={styles.box}>
        <span className={styles.title}>{title}</span>
        <div>
          <strong>{name}</strong>
          <p>{detail}</p>
          <span className={styles.metaLabel}>{metaLabel}</span> <span>{metaValue}</span>
        </div>
      </div>
    </div>
  )
}

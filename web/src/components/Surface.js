import styles from "./Surface.module.css";

const Surface = ({ children, stackVertical, width }) => {
    return (<div className={styles.surface} style={{ flexDirection: stackVertical ? "column" : "row", width: width ? width : "auto" }}>{children}</div>);
}

export default Surface;
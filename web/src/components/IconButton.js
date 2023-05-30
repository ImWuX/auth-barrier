import styles from "./IconButton.module.css";

const IconButton = ({ onClick, icon }) => {
    return (<button className={styles.iconbutton} onClick={onClick}><img src={icon} alt="Icon" /></button>);
}

export default IconButton;
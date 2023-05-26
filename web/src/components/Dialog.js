import * as DialogPrimitive from '@radix-ui/react-dialog';
import styles from "./Dialog.module.css";

const Dialog = ({ children, title, description, open, close, center, width }) => {

    const onClose = (ev) => {
        ev.preventDefault();
        close();
    }

    return (
        <DialogPrimitive.Root open={open}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className={styles.overlay} />
                <DialogPrimitive.Content className={styles.content} style={{ alignItems: center ? "center" : "initial", width: width }} onPointerDownOutside={onClose} onEscapeKeyDown={onClose} onOpenAutoFocus={(ev) => ev.preventDefault()}>
                    {title && <DialogPrimitive.Title>{title}</DialogPrimitive.Title>}
                    {description && <DialogPrimitive.Description style={{ textAlign: center ? "center" : "initial" }} >{description}</DialogPrimitive.Description>}
                    {children}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export default Dialog;
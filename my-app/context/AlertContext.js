import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert, { ALERT_TYPES } from '../components/CustomAlert';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: ALERT_TYPES.INFO,
        buttons: [],
    });

    const showAlert = useCallback(({ title, message, type = ALERT_TYPES.INFO, buttons = [] }) => {
        // If buttons are provided, wrap their onPress to ensure closure (if desirable)
        // or let the user handle it.
        // To mimic RN Alert better: we often want to close *then* run action, or run action *then* close.
        // Let's wrap safely.

        const wrappedButtons = buttons.length > 0 ? buttons.map(btn => ({
            ...btn,
            onPress: () => {
                hideAlert();
                if (btn.onPress) {
                    // Slight delay to allow animation close? No, instant is usually better feel for actions.
                    btn.onPress();
                }
            }
        })) : [{ text: 'OK', onPress: () => hideAlert() }];

        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            buttons: wrappedButtons,
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert, ALERT_TYPES }}>
            {children}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
};

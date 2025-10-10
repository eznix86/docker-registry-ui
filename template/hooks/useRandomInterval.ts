import React from "react";
import { random } from "../utils";

export const useRandomInterval = (callback: () => any, minDelay: number | null, maxDelay: number | null) => {
    const timeoutId = React.useRef<number | undefined>(undefined);
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        let isEnabled =
            typeof minDelay === 'number' && typeof maxDelay === 'number';

        if (isEnabled) {
            const handleTick = () => {
                const nextTickAt = random(minDelay as number, maxDelay as number);

                timeoutId.current = window.setTimeout(() => {
                    savedCallback.current();
                    handleTick();
                }, nextTickAt);
            };

            handleTick();
        }

        return () => window.clearTimeout(timeoutId.current);
    }, [minDelay, maxDelay]);

    const cancel = React.useCallback(function () {
        window.clearTimeout(timeoutId.current);
    }, []);

    return cancel;
};

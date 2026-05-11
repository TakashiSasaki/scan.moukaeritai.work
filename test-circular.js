const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]";
            }
            seen.add(value);
        }
        return value;
    };
};

const y = {};
const k = {};
y.i = k;
k.src = y;

k.toJSON = function() {
    return { src: y }; 
};

try {
    console.log(JSON.stringify(y, getCircularReplacer()));
} catch(e) {
    console.log("Error with replacer:", e.stack);
}

console.log("React StrictMode behavior with useRef:");
console.log("Mount 1 sets ref=true, unmounts.");
console.log("Mount 2 sees ref=true, returns early.");
console.log("Mount 1 async finishes, sets ref=false, but mounted=false, so no state update.");

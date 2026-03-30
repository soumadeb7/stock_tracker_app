function readPackage(pkg) {
    // Auto-approve build scripts for msw and protobufjs
    if (pkg.name === 'msw' || pkg.name === 'protobufjs') {
        delete pkg.scripts;
    }
    return pkg;
}

module.exports = {
    hooks: {
        readPackage,
    },
};

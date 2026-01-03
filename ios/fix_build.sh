#!/bin/bash

# Fix for unsupported -G flag issue
export FLUTTER_BUILD_MODE=debug
export ARCHS="arm64"
export VALID_ARCHS="arm64"
export ONLY_ACTIVE_ARCH=YES

# Remove problematic flags
export OTHER_CFLAGS=""
export OTHER_CPLUSPLUSFLAGS=""

# Run flutter build
flutter build ios --simulator --debug --no-codesign
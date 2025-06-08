#!/usr/bin/env python3
"""
Validate Flutter project structure for Verpa mobile app
"""
import os
import json
from pathlib import Path

def validate_file_structure():
    """Validate that all required files and directories exist"""
    base_path = Path('/home/saloom/my/verpa/mobile')
    
    required_files = [
        'pubspec.yaml',
        'lib/main.dart',
        'lib/core/api/api_client.dart',
        'lib/core/constants/app_constants.dart',
        'lib/core/storage/storage_service.dart',
        'lib/core/theme/app_theme.dart',
        'lib/core/utils/app_router.dart',
        'lib/features/auth/bloc/auth_bloc.dart',
        'lib/features/auth/bloc/auth_event.dart',
        'lib/features/auth/bloc/auth_state.dart',
        'lib/features/auth/screens/login_screen.dart',
        'lib/features/auth/screens/register_screen.dart',
        'lib/features/auth/screens/forgot_password_screen.dart',
        'lib/features/dashboard/screens/dashboard_screen.dart',
        'lib/shared/models/user_model.dart',
        'lib/shared/screens/splash_screen.dart',
        'lib/shared/screens/onboarding_screen.dart',
        'lib/shared/widgets/custom_button.dart',
        'lib/shared/widgets/custom_text_field.dart',
        'lib/shared/widgets/loading_overlay.dart',
    ]
    
    required_dirs = [
        'lib/core',
        'lib/features/auth',
        'lib/features/dashboard',
        'lib/features/aquarium',
        'lib/features/profile',
        'lib/features/settings',
        'lib/shared',
    ]
    
    print("🔍 Validating Flutter project structure...")
    print(f"📁 Base path: {base_path}")
    
    # Check directories
    missing_dirs = []
    for dir_path in required_dirs:
        full_path = base_path / dir_path
        if not full_path.exists():
            missing_dirs.append(dir_path)
        else:
            print(f"✅ Directory: {dir_path}")
    
    # Check files
    missing_files = []
    for file_path in required_files:
        full_path = base_path / file_path
        if not full_path.exists():
            missing_files.append(file_path)
        else:
            print(f"✅ File: {file_path}")
    
    # Report results
    if missing_dirs:
        print("\n❌ Missing directories:")
        for dir_path in missing_dirs:
            print(f"   - {dir_path}")
    
    if missing_files:
        print("\n❌ Missing files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
    
    if not missing_dirs and not missing_files:
        print("\n🎉 All required files and directories are present!")
        return True
    else:
        print(f"\n❌ Missing {len(missing_dirs)} directories and {len(missing_files)} files")
        return False

def validate_pubspec():
    """Validate pubspec.yaml dependencies"""
    pubspec_path = Path('/home/saloom/my/verpa/mobile/pubspec.yaml')
    
    if not pubspec_path.exists():
        print("❌ pubspec.yaml not found")
        return False
    
    print("\n📦 Validating pubspec.yaml dependencies...")
    
    required_deps = [
        'flutter_bloc',
        'dio',
        'hive_flutter',
        'go_router',
        'flutter_secure_storage',
        'shared_preferences',
        'logger',
        'equatable'
    ]
    
    try:
        with open(pubspec_path, 'r') as f:
            content = f.read()
        
        missing_deps = []
        for dep in required_deps:
            if dep not in content:
                missing_deps.append(dep)
            else:
                print(f"✅ Dependency: {dep}")
        
        if missing_deps:
            print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
            return False
        else:
            print("\n🎉 All required dependencies are present!")
            return True
            
    except Exception as e:
        print(f"❌ Error reading pubspec.yaml: {e}")
        return False

def validate_dart_syntax():
    """Basic validation of Dart file syntax"""
    print("\n🔧 Validating Dart file syntax...")
    
    dart_files = [
        '/home/saloom/my/verpa/mobile/lib/main.dart',
        '/home/saloom/my/verpa/mobile/lib/core/api/api_client.dart',
        '/home/saloom/my/verpa/mobile/lib/features/auth/bloc/auth_bloc.dart',
        '/home/saloom/my/verpa/mobile/lib/features/auth/screens/login_screen.dart',
    ]
    
    for file_path in dart_files:
        path = Path(file_path)
        if path.exists():
            try:
                with open(path, 'r') as f:
                    content = f.read()
                
                # Basic syntax checks
                if content.count('{') != content.count('}'):
                    print(f"❌ Unmatched braces in {path.name}")
                elif content.count('(') != content.count(')'):
                    print(f"❌ Unmatched parentheses in {path.name}")
                elif 'import ' in content and 'class ' in content:
                    print(f"✅ Basic syntax OK: {path.name}")
                else:
                    print(f"⚠️  Suspicious content in {path.name}")
                    
            except Exception as e:
                print(f"❌ Error reading {path.name}: {e}")
        else:
            print(f"❌ File not found: {path.name}")

def main():
    """Main validation function"""
    print("🚀 Verpa Mobile App - Project Structure Validation")
    print("=" * 50)
    
    structure_ok = validate_file_structure()
    pubspec_ok = validate_pubspec()
    validate_dart_syntax()
    
    print("\n" + "=" * 50)
    if structure_ok and pubspec_ok:
        print("🎉 Project validation PASSED!")
        print("📱 The Flutter project structure is ready for development.")
        print("\n💡 Next steps:")
        print("   1. Run 'flutter pub get' to install dependencies")
        print("   2. Run 'flutter analyze' to check for issues")
        print("   3. Run 'flutter run' to start the app")
    else:
        print("❌ Project validation FAILED!")
        print("🔧 Please fix the missing files/dependencies before proceeding.")
    
    return structure_ok and pubspec_ok

if __name__ == "__main__":
    main()
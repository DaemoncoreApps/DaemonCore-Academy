!macro customInit
  ${IfNot} ${Silent}
    ${If} $hasPerMachineInstallation == "1"
    ${OrIf} $hasPerUserInstallation == "1"
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON1 "DaemonCore Academy is already installed.$\r$\n$\r$\nSetup will close the existing app, uninstall the previous version, and install this update. Your operator record, course progress, FieldOps case files, and license data will be kept.$\r$\n$\r$\nContinue?" IDYES daemoncore_upgrade_confirmed
      Quit
      daemoncore_upgrade_confirmed:
    ${EndIf}
  ${EndIf}
!macroend

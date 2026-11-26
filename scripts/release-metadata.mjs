export function validateMetadata(manifest, pkg, versions, tag) {
  const errors = [];
  if (manifest.id !== 'table-scale') errors.push('Keep the stable plugin ID: table-scale.');
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) errors.push('Version must use x.y.z.');
  if (pkg.version !== manifest.version) errors.push('package.json and manifest.json versions differ.');
  if (versions[manifest.version] !== manifest.minAppVersion) errors.push('versions.json must map this version to minAppVersion.');
  if (!/^\d+\.\d+\.\d+$/.test(manifest.minAppVersion ?? '')) errors.push('minAppVersion must use x.y.z.');
  if (typeof manifest.description !== 'string' || !manifest.description.length || manifest.description.length > 250
    || !manifest.description.endsWith('.')) errors.push('Description must be 1–250 characters and end with a period.');
  if (!manifest.author?.trim() || manifest.author === 'Local developer') errors.push('Set the public author name.');
  if (manifest.isDesktopOnly !== true) errors.push('Keep desktop-only support until mobile has been implemented and tested.');
  if (tag && tag !== manifest.version) errors.push('Release tag must match the manifest version, without a v prefix.');
  return errors;
}

class User < ApplicationRecord
  # Optional: ensure x/y are raw hex strings
  validate :validate_pubkey_coordinates

  private

  def validate_pubkey_coordinates
    coords = pubkey_coordinates || {}
    %w[x y].each do |k|
      v = coords[k]
      unless v.is_a?(String) && v.match?(/\A0x[0-9a-fA-F]+\z/)
        errors.add(:pubkey_coordinates, "#{k} must be a hex string (0x...)")
      end
    end
  end
end
# db/migrate/20250722_add_unique_index_to_users_username.rb
class AddUniqueIndexToUsersUsername < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :username, unique: true
  end
end

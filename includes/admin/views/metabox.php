<?php
if (!$is_published) {
?>

    <p>Please publish to enable Frontpage Engine. We will allow for front page selection for scheduled posts in a future release.</p>
    
<?php
return;
}
?>
<table>
    <tr>
        <th>Frontpage</th>
        <th>Position</th>
    </tr>
<?php
if (!$is_published) {
?>
<tr>
    <td>
        Please publish this page to enable the Frontpage Engine. We will allow for scheduling in a future release.
    </td>
</tr>
</table>
<?php
return;
}
?>
<?php
foreach($frontpages as $frontpage) {
?>
<tr>
    <td><?php esc_html_e($frontpage->name); ?></td>
    <td>
        <select name="frontpage_engine_position_<?php esc_attr_e($frontpage->id) ?>">
            <?php
            if ($frontpage->position === -1 || !$is_published) {
            ?>
            <option value="-1" selected="selected">None</option>
            <?php
            }
            ?>
    <?php
    for($x = 0; $x < $frontpage->number_of_slots; $x++) {
        $selected = "";
        if ($x === $frontpage->position) {
            $selected = "selected";
        }
        ?>
            <option value="<?php esc_attr_e($x); ?>" <?php esc_attr_e($selected); ?>><?php esc_html_e($x + 1); ?></option>
        <?php
    }
    ?>
        </select>
    </td>
</tr>
<?php
}
?>
</table>